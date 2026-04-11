import { AdStatus } from "../enum/adstatus.enum";
import { PaymentMethod } from "../enum/paymentmethod.enum";
import { PaymentStatus } from "../enum/paymentstat.enum";


export class Ad {
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
    transactionId?: string;
    isDeleted?: boolean = false;

    //payment details

    paymentStatus?: PaymentStatus;

    planDetails?: {
        planName?: string;
        planCode?: string;
        features?: string[];
        imageCount?: number;
        videoCount?: number;
    }




    constructor(partial: Partial<Ad>) {
        Object.assign(this, partial);
        this.status = partial.status ?? AdStatus.PENDING_APPROVAL;
        this.paymentStatus = partial.paymentStatus ?? PaymentStatus.NOTVERIFIED;
        this.rejectionReason = partial.rejectionReason ?? '';
        this.approvalDate = partial.approvalDate;
        this.isDeleted = partial.isDeleted ?? false;
    }




}

export class AdSchema extends Ad {
    constructor(partial: Partial<AdSchema>) {
        super(partial);
    }
}