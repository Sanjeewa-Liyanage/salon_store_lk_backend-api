import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAdminNotificationDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    message: string;

    @IsString()
    @IsNotEmpty()
    type: string;
}
