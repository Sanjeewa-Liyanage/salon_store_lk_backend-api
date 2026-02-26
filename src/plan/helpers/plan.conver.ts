import { DocumentData, QueryDocumentSnapshot, FirestoreDataConverter } from 'firebase-admin/firestore';

import { Plan } from '../schema/plan.schema';

export const planConverter: FirestoreDataConverter<Plan>={
    toFirestore(plan: Plan): DocumentData {
        const data = { ...plan };
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Plan {
        const data = snapshot.data();
        return new Plan({
            ...data,
            id: snapshot.id,
        });
    }
}