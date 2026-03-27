// payment/dto/reject-payment.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPaymentDto {
    @IsString()
    @IsNotEmpty()
    reason: string;
}