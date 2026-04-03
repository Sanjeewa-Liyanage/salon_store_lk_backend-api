import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NotificationStatus } from '../enum/notificationstatus.enum';

export class CreateNotificationDto {
    @IsString()
    @IsNotEmpty()
    recipientId: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsEnum(NotificationStatus)
    status?: NotificationStatus;
}
