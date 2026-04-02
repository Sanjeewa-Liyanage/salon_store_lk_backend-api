import { UserStatus } from "../enum/userstatus.enum";
import { UserRole } from "../enum/userrole.enum";


export class UserSchema {
    id?: string;
    userCode?: string; // e.g. SSLC-26-0001
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: UserRole;
    registeredAt?: Date;
    isActive?: boolean;
    status?: UserStatus;
    refreshToken?: string;
    emailVerificationToken?: string;
    emailVerificationTokenExpires?: Date;
    otp?: string;
    otpExpires?: Date;
    profilePictureUrl?: string;

    // optional 
    businessLicense?: string;
    verificationDate?: Date;
    isVerified?: boolean;
    salonIds?: string[];
    adminLevel?: string;
    loyaltyPoints?: number;

    constructor(partial: Partial<UserSchema>) {
        Object.assign(this, partial);
    }

}
export class User extends UserSchema {
    constructor(partial: Partial<User>) {
        super(partial);
    }
}
export class SalonOwner extends User {
    businessLicense: string;
    salonIds?: string[] | undefined;
    isVerified: boolean;

    constructor(partial: Partial<SalonOwner>) {
        super(partial);
        this.role = UserRole.SALON_OWNER;
        this.businessLicense = partial.businessLicense ?? '';
        this.salonIds = partial.salonIds ?? [];
        this.isVerified = partial.isVerified ?? false;
    }

}

export class Admin extends User {
    adminLevel: string;

    constructor(partial: Partial<Admin>) {
        super(partial);
        this.role = UserRole.ADMIN;
        this.adminLevel = partial.adminLevel ?? 'SUPER';
    }
}
export class Customer extends User {
    loyaltyPoints: number;
    constructor(partial: Partial<Customer>) {
        super(partial);
        this.role = UserRole.CUSTOMER;
        this.loyaltyPoints = partial.loyaltyPoints ?? 0;
    }
}