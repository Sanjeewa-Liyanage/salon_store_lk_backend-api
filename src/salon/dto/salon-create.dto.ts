import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsEnum, IsObject } from 'class-validator';

export class SalonCreateDto{
    @IsString()
    @IsNotEmpty()
    salonName: string;

    @IsString()
    description:string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @IsOptional()
    @IsBoolean()
    isActive: boolean = true;

    @IsOptional()
    @IsString()
    openingTime?: Date;

    @IsOptional()
    @IsString()
    closingTime?: Date;

    @IsOptional()
    @IsObject()
    services?: {
        name: string;
        price: number;
        duration: number; 
    }[];
    @IsOptional()
    @IsString({ each: true })
    images?: string[];



}
