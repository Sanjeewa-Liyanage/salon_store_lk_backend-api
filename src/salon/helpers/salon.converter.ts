import { DocumentData, QueryDocumentSnapshot, FirestoreDataConverter } from 'firebase-admin/firestore';
import { Salon } from '../schemas/salon.schema';

export const salonConverter: FirestoreDataConverter<Salon> = {
  toFirestore(salon: Salon): DocumentData {
    const data = { ...salon };
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    return data;
  },
  
  fromFirestore(snapshot: QueryDocumentSnapshot): Salon {
    const data = snapshot.data();
    
    

    return new Salon({
        ...data,
        id: snapshot.id,
    });
  }
};