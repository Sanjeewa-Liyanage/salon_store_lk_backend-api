import { DocumentData, QueryDocumentSnapshot, FirestoreDataConverter } from 'firebase-admin/firestore';
import { UserRole } from '../enum/userrole.enum';
import { UserSchema,SalonOwner,Admin,Customer,User } from '../schema/user.schema';


export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: User): DocumentData {
    const data = { ...user };
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    return data;
  },
  
  fromFirestore(snapshot: QueryDocumentSnapshot): User {
    const data = snapshot.data();
    
    const registeredAt = (data.registeredAt as any)?.toDate ? (data.registeredAt as any).toDate() : data.registeredAt;

    const baseData = { ...data, id: snapshot.id, registeredAt: registeredAt };

    switch (data.role) {
      case UserRole.SALON_OWNER:
        return new SalonOwner(baseData);
      case UserRole.ADMIN:
        return new Admin(baseData);
      case UserRole.CUSTOMER:
      default:
        return new Customer(baseData);
    }
  }
};