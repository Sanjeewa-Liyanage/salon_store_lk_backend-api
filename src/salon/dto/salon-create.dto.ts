import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested,
} from 'class-validator';

class ContactInfoDto {
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsString()
    whatsappNumber?: string;
}

class SalonServiceItemDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    price: number;

    @IsNumber()
    duration: number;
}

class SocialMediaLinksDto {
    @IsOptional()
    @IsUrl()
    facebook?: string;

    @IsOptional()
    @IsUrl()
    instagram?: string;

    @IsOptional()
    @IsUrl()
    twitter?: string;

    @IsOptional()
    @IsUrl()
    tiktok?: string;

    @IsOptional()
    @IsUrl()
    youtube?: string;
}

export class SalonCreateDto{
    @IsString()
    @IsNotEmpty()
    salonName: string;

    @IsOptional()
    @IsString()
    overview?: string;

    @IsOptional()
    @IsString()
    description?:string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => ContactInfoDto)
    contactInfo?: ContactInfoDto;

    @IsOptional()
    @IsBoolean()
    isActive: boolean = true;

    @IsOptional()
    @IsString()
    openingTime?: string;

    @IsOptional()
    @IsString()
    closingTime?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SalonServiceItemDto)
    services?: SalonServiceItemDto[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @ValidateNested()
    @Type(() => SocialMediaLinksDto)
    socialMediaLinks?: SocialMediaLinksDto;

}
