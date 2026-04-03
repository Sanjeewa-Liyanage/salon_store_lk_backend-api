import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

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
                this.logger.warn(`Client ${client.id} rejected: Invalid token - ${err.message}`);
                client.emit('error', { message: 'Invalid or expired token.' });
                client.disconnect(true);
                return;
            }

            const userId = payload.sub;
            const role = payload.role;

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
            this.logger.error(`Connection error: ${error.message}`);
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

    sendToAdmin(event: string, data: any) {
        this.server.to('admin_room').emit(event, data);
    }

    sendToSalonOwner(salonId: string, event: string, data: any) {
        this.server.to(`salon_${salonId}`).emit(event, data);
    }

    sendToUser(userId: string, event: string, data: any) {
        this.server.to(`user_${userId}`).emit(event, data);
    }
}

