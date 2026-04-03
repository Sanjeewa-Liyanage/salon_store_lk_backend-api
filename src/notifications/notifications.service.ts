import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { firestore } from 'firebase-admin';
import { FirebaseService } from '../firebase/firebase.service';
import { UserRole } from '../user/enum/userrole.enum';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationStatus } from './enum/notificationstatus.enum';
import { notificationConverter } from './helpers/notification.converter';
import { Notification } from './schema/notification.schema';

@Injectable()
export class NotificationsService {
    constructor(private firebaseService: FirebaseService) {}

    private getCollection() {
        return this.firebaseService
            .getFirestore()
            .collection('notifications')
            .withConverter(notificationConverter);
    }

    private getUsersCollection() {
        return this.firebaseService.getFirestore().collection('users');
    }

    async create(dto: CreateNotificationDto): Promise<Notification> {
        const payload = {
            recipientId: dto.recipientId,
            title: dto.title,
            message: dto.message,
            type: dto.type,
            status: dto.status ?? NotificationStatus.UNREAD,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await this.getCollection().add(payload as any);
        const createdDoc = await docRef.get();
        const notification = createdDoc.data();

        if (!notification) {
            throw new BadRequestException('Failed to create notification');
        }

        return notification;
    }

    async createForAdmins(dto: CreateAdminNotificationDto): Promise<Notification[]> {
        const adminsSnapshot = await this.getUsersCollection()
            .where('role', '==', UserRole.ADMIN)
            .get();

        if (adminsSnapshot.empty) {
            return [];
        }

        return Promise.all(
            adminsSnapshot.docs.map((doc) =>
                this.create({
                    recipientId: doc.id,
                    title: dto.title,
                    message: dto.message,
                    type: dto.type,
                }),
            ),
        );
    }

    async findAllForUser(userId: string, query?: QueryNotificationsDto): Promise<any> {
        const page = query?.page;
        const limit = query?.limit;

        const notificationsSnapshot = await this.getCollection()
            .where('recipientId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const notifications = notificationsSnapshot.docs.map((doc) => doc.data());

        if (page === undefined || limit === undefined) {
            return {
                data: notifications,
                total: notifications.length,
            };
        }

        const totalItems = notifications.length;
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;
        const data = notifications.slice(offset, offset + limit);

        return {
            data,
            pagination: {
                currentPage: page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    }

    async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
        const unreadSnapshot = await this.getCollection()
            .where('recipientId', '==', userId)
            .where('status', '==', NotificationStatus.UNREAD)
            .get();

        return {
            unreadCount: unreadSnapshot.size,
        };
    }

    async markAsRead(notificationId: string, userId: string): Promise<any> {
        const docRef = this.getCollection().doc(notificationId);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new NotFoundException(`Notification with ID ${notificationId} not found`);
        }

        const notification = doc.data();
        if (!notification) {
            throw new NotFoundException(`Notification with ID ${notificationId} not found`);
        }

        if (notification.recipientId !== userId) {
            throw new ForbiddenException('You are not allowed to update this notification');
        }

        if (notification.status === NotificationStatus.READ) {
            return {
                message: 'Notification already marked as read',
                notification,
            };
        }

        await docRef.update({
            status: NotificationStatus.READ,
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        const updatedDoc = await docRef.get();
        return {
            message: 'Notification marked as read',
            notification: updatedDoc.data(),
        };
    }

    async markAllAsRead(userId: string): Promise<{ message: string; updatedCount: number }> {
        const unreadSnapshot = await this.getCollection()
            .where('recipientId', '==', userId)
            .where('status', '==', NotificationStatus.UNREAD)
            .get();

        if (unreadSnapshot.empty) {
            return {
                message: 'All notifications are already read',
                updatedCount: 0,
            };
        }

        const batch = this.firebaseService.getFirestore().batch();

        unreadSnapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                status: NotificationStatus.READ,
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        });

        await batch.commit();

        return {
            message: 'All notifications marked as read',
            updatedCount: unreadSnapshot.size,
        };
    }
}
