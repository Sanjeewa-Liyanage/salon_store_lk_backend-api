// payment/payment.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { paymentConverter } from './helpers/payment.conveter';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './schema/payment.schema';
import { PaymentStatus } from './enum/paymentstatus.enum';
import { firestore } from 'firebase-admin';
import { SalonService } from '../salon/salon.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class PaymentService {
    constructor(
        private firebaseService: FirebaseService,
        private salonService: SalonService,
        private notificationsGateway: NotificationsGateway,
        @Inject('GENERATE_TRANSACTION_ID') private generateTransactionId: (prefix?: string) => string
    ) { }

    private getCollection() {
        return this.firebaseService
            .getFirestore()
            .collection('payments')
            .withConverter(paymentConverter);
    }

    private getAdCollection() {
        return this.firebaseService.getFirestore().collection('ads');
    }

    // ─── owner submits slip ───────────────────────────────────────────────────

    async submitPayment(dto: CreatePaymentDto, userId: string): Promise<any> {
        const adId = dto.referenceId;
        // verify the salon belongs to this user
        const adDoc = await this.getAdCollection().doc(adId).get();
        if (!adDoc.exists) {
            throw new BadRequestException(`Ad with ID ${adId} not found`);
        }
        const ad = adDoc.data();
        if (!ad) {
            throw new BadRequestException(`Ad with ID ${adId} has no data`);
        }
        await this.salonService.checkOwnership(ad.salonId, userId);

        // one payment per ad — reject if one already exists and isn't rejected
        const existing = await this.getCollection()
            .where('referenceId', '==', dto.referenceId)
            .limit(1)
            .get();

        if (!existing.empty) {
            const existingPayment = existing.docs[0].data();
            if (existingPayment.status !== PaymentStatus.REJECTED) {
                throw new BadRequestException(
                    `A payment for this ad already exists with status: ${existingPayment.status}`
                );
            }
            const newTransactionId = this.generateTransactionId();
            // previous was rejected — update it instead of creating a new one
            const docRef = existing.docs[0].ref;
            await docRef.update({
                paymentProofUrl: dto.paymentProofUrl,
                transactionId: newTransactionId,
                paymentMethod: dto.paymentMethod,
                status: PaymentStatus.PENDING_VERIFICATION,
                rejectionReason: '',
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
            await this.updateAdPaymentStatus(adId, PaymentStatus.PENDING_VERIFICATION);
            return { message: 'Payment resubmitted successfully', paymentId: docRef.id };
        }

        // fresh submission
        const paymentData = {
            referenceId: dto.referenceId,
            paymentProofUrl: dto.paymentProofUrl,
            transactionId: this.generateTransactionId(),
            paymentMethod: dto.paymentMethod,
            status: PaymentStatus.PENDING_VERIFICATION,
            rejectionReason: '',
            verifiedAt: null,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await this.getCollection().add(paymentData as any);
        await this.updateAdPaymentStatus(dto.referenceId, PaymentStatus.PENDING_VERIFICATION);
        // send notification to admin
        const salonName = await this.salonService.getSalonById(ad.salonId);
        this.notificationsGateway.sendToAdmin('payment-submitted', {
            salonName: salonName.salonName,
            paymentId: docRef.id,
            adId: dto.referenceId,
            message: `New payment submitted for ad ${dto.referenceId} by salon ${salonName.salonName}` // you can customize this message as needed
        });

        return { message: 'Payment submitted successfully', paymentId: docRef.id };


    }

    // ─── admin actions ────────────────────────────────────────────────────────

    async verifyPayment(paymentId: string): Promise<any> {
        const docRef = this.getCollection().doc(paymentId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new BadRequestException(`Payment with ID ${paymentId} not found`);
        }

        const payment = doc.data();
        if (payment?.status !== PaymentStatus.PENDING_VERIFICATION) {
            throw new BadRequestException(
                `Only PENDING_VERIFICATION payments can be verified (current: ${payment?.status})`
            );
        }

        await docRef.update({
            status: PaymentStatus.VERIFIED,
            verifiedAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        await this.updateAdPaymentStatus(payment.referenceId, PaymentStatus.VERIFIED);

        return { message: 'Payment verified successfully', paymentId };
    }

    async rejectPayment(paymentId: string, reason: string): Promise<any> {
        const docRef = this.getCollection().doc(paymentId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new BadRequestException(`Payment with ID ${paymentId} not found`);
        }

        const normalizedReason = (reason ?? '').trim();
        if (!normalizedReason) {
            throw new BadRequestException('Rejection reason is required');
        }

        const payment = doc.data();
        if (payment?.status !== PaymentStatus.PENDING_VERIFICATION) {
            throw new BadRequestException(
                `Only PENDING_VERIFICATION payments can be rejected (current: ${payment?.status})`
            );
        }

        await docRef.update({
            status: PaymentStatus.REJECTED,
            rejectionReason: normalizedReason,
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        await this.updateAdPaymentStatus(payment.referenceId, PaymentStatus.REJECTED);

        return { message: 'Payment rejected', paymentId };
    }

    // ─── queries ──────────────────────────────────────────────────────────────

    async getPaymentByAdId(adId: string): Promise<Payment> {
        const snapshot = await this.getCollection()
            .where('adId', '==', adId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            throw new BadRequestException(`No payment found for ad ID ${adId}`);
        }
        return snapshot.docs[0].data() as Payment;
    }

    async getPendingPayments(): Promise<Payment[]> {
        const snapshot = await this.getCollection()
            .where('status', '==', PaymentStatus.PENDING_VERIFICATION)
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => doc.data() as Payment);
    }

    // ─── internal helper ──────────────────────────────────────────────────────

    private async updateAdPaymentStatus(adId: string, status: PaymentStatus): Promise<void> {
        await this.getAdCollection().doc(adId).update({
            paymentStatus: status,
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    }
    async getPayamentsByreferenceId(referenceId: string): Promise<Payment[]> {
        const snapshot = await this.getCollection()
            .where('referenceId', '==', referenceId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => doc.data() as Payment);
    }

}
//? this focused on the ads mainly if you want to use this payment service for another purpose you might be make separate functions for it use referenceId as your purpose id and update the relevant collection based on that
