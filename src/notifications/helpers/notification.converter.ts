import { FirestoreDataConverter } from 'firebase-admin/firestore';
import { Notification } from '../schema/notification.schema';

export const notificationConverter: FirestoreDataConverter<Notification> = {
    toFirestore(notification: Notification) {
        const { id, ...data } = notification;
        return data;
    },
    fromFirestore(snapshot): Notification {
        const data = snapshot.data();
        return new Notification({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt,
        });
    },
};
