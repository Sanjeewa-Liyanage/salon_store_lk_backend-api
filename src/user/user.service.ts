import { ConflictException, Injectable } from '@nestjs/common';
import { userConverter } from './helpers/firestoredata-converter';
import { User,SalonOwner } from './schema/user.schema';
import * as bcrypt from 'bcrypt';
import { UserRegistrationDto } from './dto/userregister.dto';
import { UserRole } from './enum/userrole.enum';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UserService {
    constructor(private firebaseService:FirebaseService){}

    private getUsersCollection(){
        return this.firebaseService.getFirestore()
            .collection('users')
            .withConverter(userConverter);
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

        
        const newOwner = new SalonOwner(data);

        await collection.add(newOwner); 
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

    async findOne(id: string): Promise<any> {
    const doc = await this.getUsersCollection().doc(id).get();
    
    if (!doc.exists) return null;
    
    
    const user = doc.data(); 
    return user; 
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
    
}
