import { DocumentData, QueryDocumentSnapshot, FirestoreDataConverter } from 'firebase-admin/firestore';
import { Ad } from '../schema/ads.schema';

export const adConverter: FirestoreDataConverter<Ad> = {
    toFirestore(ad: Ad): DocumentData {
        const data = { ...ad };
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Ad {
        const data = snapshot.data();
        return new Ad({
            ...data,
            id: snapshot.id,
        });
    }

}
