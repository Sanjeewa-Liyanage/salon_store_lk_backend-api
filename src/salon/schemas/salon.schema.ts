import { SalonStatus } from "../enum/salonstatus.enum";
export class SalonSchema{
    id?: string;
    salonCode?: string; 
    salonName?: string;
    description?: string;
    address?: string;
    city?: string;
    phoneNumber?: string;
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
    suspensionReason?: string;
    


    constructor(partial: Partial<SalonSchema>) {
        Object.assign(this, partial);
    }
    
}
export class Salon extends SalonSchema {
    constructor(partial: Partial<Salon>) {
        super(partial);
    }
}