import { NotificationStatus } from '../enum/notificationstatus.enum';

export class Notification {
    id?: string;
    recipientId: string;
    title: string;
    message: string;
    type: string;
    status: NotificationStatus;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(partial: Partial<Notification>) {
        this.status = NotificationStatus.UNREAD;
        Object.assign(this, partial);
    }
}
