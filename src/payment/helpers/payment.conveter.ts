// payment/helpers/payment.converter.ts
import { FirestoreDataConverter } from 'firebase-admin/firestore';
import { Payment } from '../schema/payment.schema';
export const paymentConverter: FirestoreDataConverter<Payment> = {
    toFirestore(payment: Payment) {
        const { id, ...data } = payment;
        return data;
    },
    fromFirestore(snapshot): Payment {
        const data = snapshot.data();
        return new Payment({
            id: snapshot.id,
            ...data,
            verifiedAt: data.verifiedAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        });
    },
};