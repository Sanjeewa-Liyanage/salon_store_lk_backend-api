// payment/schema/payment.schema.ts
import { PaymentMethod } from '../enum/paymentmethod.enum';
import { PaymentStatus } from '../enum/paymentstatus.enum';
export class Payment {
    id?: string;
    referenceId: string;
    paymentProofUrl: string;
    transactionId?: string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    rejectionReason?: string;
    verifiedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;

    constructor(partial: Partial<Payment>) {
        this.status = PaymentStatus.PENDING_VERIFICATION;
        this.rejectionReason = '';
        Object.assign(this, partial);
    }
}