import { SalonStatus } from "../enum/salonstatus.enum";
export class SalonSchema{
    id?: string;
    salonCode?: string; 
    overview?: string;
    salonName?: string;
    description?: string;
    address?: string;
    city?: string;
    phoneNumber?: string;
    contactInfo?: {
        phoneNumber?: string;
        whatsappNumber?: string;
    }
    location?: {
        latitude: number;
        longitude: number;
    };
    status?: SalonStatus;
    createdAt?: Date;
    isActive?: boolean;
    ownerId?: string;
    services?: {
        name: string;
        price: number;
        duration: number; 
    }[];
    images?: string[];
    openingTime?: Date;
    closingTime?: Date;
    rejectionReason?: string;
    suspensionReason?: string;4
    isDeleted?: boolean = false;    
    socialMediaLinks?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        tiktok?: string;
        youtube?: string;
    };
    


    constructor(partial: Partial<SalonSchema>) {
        Object.assign(this, partial);
        this.status = partial.status ?? SalonStatus.PENDING_VERIFICATION;
        this.rejectionReason = partial.rejectionReason ?? '';
        this.suspensionReason = partial.suspensionReason ?? '';
        this.isDeleted = partial.isDeleted ?? false;
    }
    
}
export class Salon extends SalonSchema {
    constructor(partial: Partial<Salon>) {
        super(partial);
    }
}