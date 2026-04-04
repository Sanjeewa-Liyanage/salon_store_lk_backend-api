import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { NotificationsService } from './notifications.service';

interface TokenPayload {
    sub: string;
    role: string;
    email?: string;
    iat?: number;
    exp?: number;
}

@WebSocketGateway({
    cors: {
        origin: "*",
    },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);

    constructor(private notificationsService: NotificationsService) {}

    private normalizeRole(role: unknown): string {
        if (typeof role !== 'string') {
            return '';
        }

        const normalized = role
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, '_');

        const compact = normalized.replace(/[^A-Z]/g, '');
        if (compact === 'SALONOWNER') {
            return 'SALON_OWNER';
        }
        if (compact === 'ADMIN') {
            return 'ADMIN';
        }
        if (compact === 'CUSTOMER') {
            return 'CUSTOMER';
        }

        return normalized;
    }

    private getRoomConnectionCount(room: string): number {
        return this.server.sockets.adapter.rooms.get(room)?.size ?? 0;
    }

    handleConnection(@ConnectedSocket() client: Socket) {
        try {
            const token =
                client.handshake.auth?.token ||
                client.handshake.query?.token ||
                this.extractTokenFromHeader(client.handshake.headers?.authorization as string);

            if (!token) {
                this.logger.warn(`Client ${client.id} rejected: No token provided`);
                client.emit('error', { message: 'Authentication required. Provide a valid JWT token.' });
                client.disconnect(true);
                return;
            }


            const secret = process.env.JWT_SECRET_KEY || '';
            let payload: TokenPayload;

            try {
                payload = jwt.verify(token, secret) as TokenPayload;
            } catch (err) {
                this.logger.warn(`Client ${client.id} rejected: Invalid token - ${err instanceof Error ? err.message : String(err)}`);
                client.emit('error', { message: 'Invalid or expired token.' });
                client.disconnect(true);
                return;
            }

            const userId = payload.sub;
            const role = this.normalizeRole(payload.role);

            if (!userId || !role) {
                this.logger.warn(`Client ${client.id} rejected: Token missing sub or role`);
                client.emit('error', { message: 'Invalid token payload.' });
                client.disconnect(true);
                return;
            }

            // Store user info on the socket for later use
            client.data.userId = userId;
            client.data.role = role;
            client.data.email = payload.email;

            // Join user-specific room
            const userRoom = `user_${userId}`;
            client.join(userRoom);

            // Join role-based rooms
            if (role === 'ADMIN') {
                client.join('admin_room');
            }

            if (role === 'SALON_OWNER') {
                client.join(`salon_${userId}`);
            }

            const salonRoom = `salon_${userId}`;
            this.logger.log(
                `User ${userId} (${role}) connected - Socket: ${client.id} | user room: ${userRoom} (${this.getRoomConnectionCount(userRoom)} sockets) | salon room: ${salonRoom} (${this.getRoomConnectionCount(salonRoom)} sockets)`,
            );
            client.emit('authenticated', { userId, role, message: 'Successfully authenticated' });

        } catch (error) {
            this.logger.error(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
            client.emit('error', { message: 'Authentication failed.' });
            client.disconnect(true);
        }
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        const userId = client.data?.userId || 'unknown';
        this.logger.log(` User ${userId} disconnected - Socket: ${client.id}`);
    }

    private extractTokenFromHeader(authHeader: string | undefined): string | null {
        if (!authHeader) return null;
        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : null;
    }

    private toEventTitle(event: string): string {
        return event
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    private buildNotificationContent(event: string, data: any) {
        return {
            title: data?.title || this.toEventTitle(event),
            message: data?.message || this.toEventTitle(event),
            type: data?.type || event,
        };
    }

    async sendToAdmin(event: string, data: any): Promise<{ recipientCount: number; adminRoomConnections: number }> {
        try {
            const content = this.buildNotificationContent(event, data);
            const savedNotifications = await this.notificationsService.createForAdmins(content);
            const adminConnections = this.getRoomConnectionCount('admin_room');

            if (savedNotifications.length === 0) {
                this.logger.warn(`No admins found to receive event ${event}`);
                // Still emit to role room in case admins are connected but admin user docs are misconfigured.
                this.server.to('admin_room').emit(event, data);
                return { recipientCount: 0, adminRoomConnections: adminConnections };
            }

            // Keep role-room broadcast for backwards compatibility with existing clients.
            this.server.to('admin_room').emit(event, {
                ...data,
                notifications: savedNotifications,
                notificationIds: savedNotifications.map((item) => item.id),
            });

            // Emit to each admin's dedicated user room so delivery does not depend only on role-room matching.
            for (const notification of savedNotifications) {
                this.server.to(`user_${notification.recipientId}`).emit(event, {
                    ...data,
                    notification,
                    notificationId: notification.id,
                    notifications: [notification],
                    notificationIds: [notification.id],
                });
            }
            this.logger.log(
                `Admin event ${event} sent to ${savedNotifications.length} admin recipients (${adminConnections} sockets in admin_room)`,
            );
            return { recipientCount: savedNotifications.length, adminRoomConnections: adminConnections };
        } catch (error) {
            this.logger.error(`Failed to persist admin notification for event ${event}: ${error instanceof Error ? error.message : String(error)}`);
            this.server.to('admin_room').emit(event, data);
            const adminConnections = this.getRoomConnectionCount('admin_room');
            return { recipientCount: 0, adminRoomConnections: adminConnections };
        }
    }

    async sendToSalonOwner(ownerId: string, event: string, data: any) {
        try {
            const content = this.buildNotificationContent(event, data);
            const savedNotification = await this.notificationsService.create({
                recipientId: ownerId,
                ...content,
            });

            const salonRoom = `salon_${ownerId}`;
            const userRoom = `user_${ownerId}`;
            const payload = {
                ...data,
                notification: savedNotification,
                notificationId: savedNotification.id,
            };

            // Emit to both rooms so delivery does not depend on role-room joins alone.
            this.server.to(salonRoom).emit(event, payload);
            this.server.to(userRoom).emit(event, payload);

            const salonRoomConnections = this.getRoomConnectionCount(salonRoom);
            const userRoomConnections = this.getRoomConnectionCount(userRoom);
            if (salonRoomConnections + userRoomConnections === 0) {
                this.logger.warn(
                    `Salon owner event ${event} persisted for user ${ownerId}, but no active sockets in ${salonRoom} or ${userRoom}`,
                );
            } else {
                this.logger.log(
                    `Salon owner event ${event} sent to user ${ownerId} via ${salonRoom} (${salonRoomConnections}) and ${userRoom} (${userRoomConnections})`,
                );
            }
        } catch (error) {
            this.logger.error(`Failed to persist salon owner notification for event ${event}: ${error instanceof Error ? error.message : String(error)}`);
            this.server.to(`salon_${ownerId}`).emit(event, data);
            this.server.to(`user_${ownerId}`).emit(event, data);
        }
    }

    async sendToUser(userId: string, event: string, data: any) {
        try {
            const content = this.buildNotificationContent(event, data);
            const savedNotification = await this.notificationsService.create({
                recipientId: userId,
                ...content,
            });

            this.server.to(`user_${userId}`).emit(event, {
                ...data,
                notification: savedNotification,
                notificationId: savedNotification.id,
            });
        } catch (error) {
            this.logger.error(`Failed to persist user notification for event ${event}: ${error instanceof Error ? error.message : String(error)}`);
            this.server.to(`user_${userId}`).emit(event, data);
        }
    }
}

