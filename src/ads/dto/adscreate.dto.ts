import {IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, ValidateIf} from 'class-validator';
import { AdStatus } from '../enum/adstatus.enum';
import { PaymentStatus } from '../enum/paymentstat.enum';
import { PaymentMethod } from '../enum/paymentmethod.enum';

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

    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;

    // @ValidateIf(o => o.paymentMethod === PaymentMethod.BANK_TRANSFER)
    // @IsString()
    // @IsNotEmpty()
    // paymentProofUrl?: string;

    @ValidateIf(o => o.paymentMethod === PaymentMethod.PAYMENT_GATEWAY)
    @IsString()
    @IsNotEmpty()
    transactionId?: string;

    


}