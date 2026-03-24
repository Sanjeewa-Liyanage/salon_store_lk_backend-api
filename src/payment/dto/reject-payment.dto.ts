// payment/dto/reject-payment.dto.ts
import { IsString } from 'class-validator';

export class RejectPaymentDto {
    @IsString()
    reason: string;
}