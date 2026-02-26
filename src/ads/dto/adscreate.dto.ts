import {IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber} from 'class-validator';
import { AdStatus } from '../enum/adstatus.enum';
import { PaymentStatus } from '../enum/paymentstat.enum';

export class AdsCreateDto{
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    imageUrl: string[];

    @IsString()
    @IsNotEmpty()
    planId: string;

    @IsString()
    @IsNotEmpty()
    salonId: string;

    


}