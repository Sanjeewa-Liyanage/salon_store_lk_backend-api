import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { userConverter } from './helpers/firestoredata-converter';
import { User,SalonOwner } from './schema/user.schema';
import * as bcrypt from 'bcrypt';
import { UserRegistrationDto } from './dto/userregister.dto';
import { UserRole } from './enum/userrole.enum';
import { FirebaseService } from '../firebase/firebase.service';
import { randomBytes } from 'crypto';
import { ResendMailService } from '../common/mail/resendmail.service';
import { OtpGeneratorHelper } from './helpers/otpgenerator.helper';
import { UserUpdateDto } from './dto/user-update.dto';
import { UserStatus } from './enum/userstatus.enum';
@Injectable()
export class UserService {
    constructor(private firebaseService:FirebaseService,
        private resendMailService: ResendMailService
    ){}

    private getUsersCollection(){
        return this.firebaseService.getFirestore()
            .collection('users')
            .withConverter(userConverter);
    }

    private generateVerificationToken():string{
        return randomBytes(32).toString('hex');
    }


    async createUser(dto: UserRegistrationDto) {
        const collection = this.getUsersCollection();
        if(await this.findByEmail(dto.email)){
            throw new ConflictException('Email already in use');
        }

        const role = (dto.role as UserRole) || UserRole.CUSTOMER;
        const userCode = await this.generateUserCode(role); // Generate custom ID
       
        const userData:Partial<User> = {
            ...dto,
            isActive: true,
            isVerified: false,
            emailVerificationToken: this.generateVerificationToken(),
            emailVerificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            role: role,
            registeredAt: new Date(),
            userCode: userCode,
        }
        
        if (userData.password) {
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(userData.password, salt);
        }

        const newUser = new User(userData);
        const ref = await collection.add(newUser);
        newUser.id = ref.id;
        const {password, ...result} = newUser;
        await this.resendMailService.sendVerificationEmail(newUser.email!, newUser.emailVerificationToken!);
        return result;
    }

    async createSalonOwner(data: Partial<SalonOwner>) {
        const collection = this.getUsersCollection();
        
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }
// Generate userCode for Salon Owner
        data.userCode = await this.generateUserCode(UserRole.SALON_OWNER);
        data.isVerified = false;
        data.emailVerificationToken = this.generateVerificationToken();
        data.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        const newOwner = new SalonOwner(data);

        await collection.add(newOwner); 
        await this.resendMailService.sendVerificationEmail(newOwner.email!, newOwner.emailVerificationToken!);
        return newOwner;
    }

    async findByEmail(email: string): Promise<any> {
        const querySnapshot = await this.getUsersCollection()
            .where('email', '==', email)
            .get();
        if (querySnapshot.empty) return null;
        const doc = querySnapshot.docs[0];
       return{
            id: doc.id,
            ...doc.data()
       }
    }

    async findOne(id: string) {
    const doc = await this.getUsersCollection().doc(id).get();

    if (!doc.exists) return null;

    const user = doc.data();

    if (!user) return null;

    
    const { password, refreshToken, ...safeUser } = user;

    return {
        id: doc.id,
        ...safeUser,
    };
}


    async updateRefreshToken(userId: string, refreshToken: string) {
        let hashedRefreshToken: string | null = null;
        if (refreshToken) {
            const salt = await bcrypt.genSalt(10);
            hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
        }

        await this.firebaseService.getFirestore()
            .collection('users')
            .doc(userId)
            .update({ refreshToken: hashedRefreshToken });
    }

    private async generateUserCode(role: UserRole): Promise<string> {
        const firestore = this.firebaseService.getFirestore();
        const year = new Date().getFullYear().toString().slice(-2); // "26"
        let roleChar = 'C'; // Default Customer

        if (role === UserRole.SALON_OWNER) roleChar = 'S';
        else if (role === UserRole.ADMIN) roleChar = 'A';

        const counterDocRef = firestore.collection('counters').doc(`user_${year}`);

        return await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(counterDocRef);
            let currentCount = 0;

            if (doc.exists) {
                const data = doc.data();
                if (data && data[roleChar]) {
                    currentCount = data[roleChar];
                }
            }

            const nextCount = currentCount + 1;
            
            // Format: SSL[Role]-[Year]-[0000]
            // e.g., SSLC-26-0001
            const countStr = nextCount.toString().padStart(4, '0');
            const userCode = `SSL${roleChar}-${year}-${countStr}`;

            // Update the counter in Firestore
            transaction.set(counterDocRef, { [roleChar]: nextCount }, { merge: true });

            return userCode;
        });
    }

    async validateUser(email:string, password:string):Promise<any>{
        const user = await this.findByEmail(email);
        if(!user) return null;

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid) return null;

        const { password: _, ...result } = user;
        return result;
    }
    // methods for email verification
    async findByVerificationToken(token: string) {
    const snapshot = await this.getUsersCollection()
        .where('emailVerificationToken', '==', token)
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const user = doc.data();

    const expires = user.emailVerificationTokenExpires instanceof Date
        ? user.emailVerificationTokenExpires
        : (user.emailVerificationTokenExpires as any)?.toDate?.();

    if (!expires || expires < new Date()) {
        console.log("TOKEN EXPIRED");
        return null;
    }

    return { id: doc.id, ...user };
    }


    async verifyUser(userId: string) {
        await this.getUsersCollection()
            .doc(userId)
            .update({
            isVerified: true,
            emailVerificationToken: null,
            emailVerificationTokenExpires: null,
        });
    }
    //? methods for password reset 
    async sendOtpToEmail(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        if (!user) {
            return false;
        }
        const otp = OtpGeneratorHelper.generateOtp();
        await this.getUsersCollection()            
        .doc(user.id)
        .update({
            otp: otp,
            otpExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        });
       
        await this.resendMailService.sendPasswordResetEmail(user.email, otp);

        return true;
    }

    async verifyOtp(email: string, otp: string): Promise<boolean> {
        const snapshot = await this.getUsersCollection()
            .where('email', '==', email)
            .where('otp', '==', otp)
            .where('otpExpires', '>', new Date())
            .get();
        
        return !snapshot.empty;
    }

    async updatePassword(email: string, newPasword: string): Promise<void> {
        const user = await this.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }
        const hashedPassword = await bcrypt.hash(newPasword, 10);
        await this.getUsersCollection()
            .doc(user.id)
            .update({
                password: hashedPassword,
                otp: null,
                otpExpires: null,
            });
    }

    async updateUser(id: string, updateDto: UserUpdateDto):Promise<boolean>{
        const user = await this.findOne(id);
        if(!user) return false;

        if (updateDto.email && updateDto.email !== user.email) {
            const existingUser = await this.findByEmail(updateDto.email);
            if (existingUser) {
                throw new ConflictException('Email already in use');
            }
        }

        const updateData: any = { ...updateDto };
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        if (Object.keys(updateData).length > 0) {
            await this.getUsersCollection()
                .doc(id)
                .update(updateData);
        }

        return true;
    }

    async suspendUser(id:string){
        const collection = this.getUsersCollection();
        const userDoc = await collection.doc(id).get();
        if (!userDoc.exists) {
            throw new NotFoundException('User not found');
        }
        await collection.doc(id).update({
            isActive: false,
            status: UserStatus.SUSPENDED
        });
        return { message: 'User suspended successfully', userId: id };
    }

    async unsuspendUser(id:string){
        const collection = this.getUsersCollection();
        const userDoc = await collection.doc(id).get();
        if (!userDoc.exists) {
            throw new NotFoundException('User not found');
        }
        await collection.doc(id).update({
            isActive: true,
            status: UserStatus.ACTIVE
        });
        return { message: 'User unsuspended successfully', userId: id };
        
    }


    }


