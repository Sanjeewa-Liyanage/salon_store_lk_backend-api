import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsEnum } from 'class-validator';
import { UserRole } from '../enum/userrole.enum';

export class UserRegistrationDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber: string;
    
    @IsOptional()
    @IsEnum(UserRole)
    role: UserRole = UserRole.CUSTOMER; 

    @IsOptional()
    @IsBoolean()
    isActive: boolean = true; 
}