// payment/dto/create-payment.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../enum/paymentmethod.enum';

export class CreatePaymentDto {
    @IsString()
    referenceId: string;

    @IsString()
    paymentProofUrl: string;  // Firebase Storage URL — uploaded client-side first

   

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;
}