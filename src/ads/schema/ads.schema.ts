import { AdStatus } from "../enum/adstatus.enum";
import { PaymentMethod } from "../enum/paymentmethod.enum";
import { PaymentStatus } from "../enum/paymentstat.enum";


export class Ad{
    id?: string;
    title?: string;
    description?: string;
    imageUrl?: string[];
    planId?: string;
    salonId?: string;
    status?: AdStatus;
    startDate?: Date;
    endDate?: Date
    createdAt?: Date;
    updatedAt?: Date;
    approvalDate?: Date;
    rejectionReason?: string;
    
    //payment details

    paymentStatus?: PaymentStatus;
    paymentMethod?: PaymentMethod;

    paymentProofUrl?: string;
    transactionId?: string;
    paymentVerifiedAt?: boolean;

    

    constructor(partial: Partial<Ad>) {
        this.status = AdStatus.PENDING_APPROVAL
        this.paymentStatus = PaymentStatus.NOTVERIFIED;
        this.rejectionReason = '';
        this.approvalDate = undefined;
        this.paymentProofUrl = undefined;
        Object.assign(this, partial);
    }




}

export class AdSchema extends Ad {
    constructor(partial: Partial<AdSchema>) {
        super(partial);
    }
}