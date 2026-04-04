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
        return typeof role === 'string' ? role.trim().toUpperCase() : '';
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
            client.join(`user_${userId}`);

            // Join role-based rooms
            if (role === 'ADMIN') {
                client.join('admin_room');
            }

            if (role === 'SALON_OWNER') {
                client.join(`salon_${userId}`);
            }

            this.logger.log(` User ${userId} (${role}) connected - Socket: ${client.id}`);
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

    async sendToAdmin(event: string, data: any) {
        try {
            const content = this.buildNotificationContent(event, data);
            const savedNotifications = await this.notificationsService.createForAdmins(content);

            if (savedNotifications.length === 0) {
                this.logger.warn(`No admins found to receive event ${event}`);
                return;
            }

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

            const adminConnections = this.server.sockets.adapter.rooms.get('admin_room')?.size ?? 0;
            this.logger.log(
                `Admin event ${event} sent to ${savedNotifications.length} admin recipients (${adminConnections} sockets in admin_room)`,
            );
        } catch (error) {
            this.logger.error(`Failed to persist admin notification for event ${event}: ${error instanceof Error ? error.message : String(error)}`);
            this.server.to('admin_room').emit(event, data);
        }
    }

    async sendToSalonOwner(salonId: string, event: string, data: any) {
        try {
            const content = this.buildNotificationContent(event, data);
            const savedNotification = await this.notificationsService.create({
                recipientId: salonId,
                ...content,
            });

            this.server.to(`salon_${salonId}`).emit(event, {
                ...data,
                notification: savedNotification,
                notificationId: savedNotification.id,
            });
        } catch (error) {
            this.logger.error(`Failed to persist salon owner notification for event ${event}: ${error instanceof Error ? error.message : String(error)}`);
            this.server.to(`salon_${salonId}`).emit(event, data);
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

