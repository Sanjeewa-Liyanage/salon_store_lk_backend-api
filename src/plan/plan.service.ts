import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { planConverter } from './helpers/plan.conver';
import { PlanCreateDto } from './dto/plancreate.dto';
import { PlanUpdateDto } from './dto/plan-update.dto';
import { firestore } from 'firebase-admin';
import { Plan } from './schema/plan.schema';
import { UserRole } from '../user/enum/userrole.enum';

@Injectable()
export class PlanService {
    constructor(private firebaseService: FirebaseService) { }

    private getPlanCollection() {
        return this.firebaseService.getFirestore()
            .collection('plans').withConverter(planConverter);

    }

    private isPlanVisible(plan?: Partial<Plan>): boolean {
        return plan?.isDeleted !== true;
    }

    private async generatePlanCode(): Promise<string> {
        const firestore = this.firebaseService.getFirestore();
        const counterDocRef = firestore.collection('counters').doc('planCode');

        const planCode = await firestore.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);

            let currentCount = 0;
            if (counterDoc.exists) {
                currentCount = counterDoc.data()?.count || 0;
            }

            const newCount = currentCount + 1;
            const code = `SSLC-PLAN-${String(newCount).padStart(3, '0')}`;

            transaction.set(counterDocRef, { count: newCount }, { merge: true });

            return code;
        });

        return planCode;
    }

    async createPlan(dto: PlanCreateDto) {
        const collection = this.getPlanCollection();
        const planCode = await this.generatePlanCode();

        const newPlan = {
            planName: dto.planName,
            planCode: planCode,
            description: dto.description,
            state: dto.state,
            price: dto.price,
            features: dto.features,
            duration: dto.duration,
            priority: dto.priority,
            imageCount: dto.imageCount ?? 0,
            videoCount: dto.videoCount ?? 0,
            isDeleted: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await collection.add(newPlan);
        const createdDoc = await docRef.get();

        return {
            id: createdDoc.id,
            ...createdDoc.data()
        };
    }
    async getPlans() {
        const collection = this.getPlanCollection();
        const snapshot = await collection.get();

        return snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter((plan) => this.isPlanVisible(plan) && plan.state === 'ACTIVE')
            .map((plan) => ({
                id: plan.id,
                planName: plan.planName,
                imageCount: plan.imageCount,
                videoCount: plan.videoCount,
            }));
    }

    async getAllPlans(page: number = 1, limit: number = 10) {
        const collection = this.getPlanCollection();

        const totalSnapshot = await collection.get();
        const visiblePlans = totalSnapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter((plan) => this.isPlanVisible(plan));

        const totalCount = visiblePlans.length;

        if (totalCount === 0) {
            return {
                data: [],
                pagination: {
                    currentPage: page,
                    limit: limit,
                    totalItems: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false
                }
            };
        }

        // Calculate pagination
        const totalPages = Math.ceil(totalCount / limit);
        const offset = (page - 1) * limit;

        // Get paginated results
        const paginatedPlans = visiblePlans.slice(offset, offset + limit);

        const data = paginatedPlans.map((plan) => ({
            ...plan,
        }));

        return {
            data,
            pagination: {
                currentPage: page,
                limit: limit,
                totalItems: totalCount,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        };
    }

    async updatePlan(id: string, dto: PlanUpdateDto) {
        const collection = this.getPlanCollection();
        const docRef = collection.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        const existingPlan = doc.data() as Plan;
        if (!this.isPlanVisible(existingPlan)) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        const updateData: any = {
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        if (dto.planName !== undefined) updateData.planName = dto.planName;
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.state !== undefined) updateData.state = dto.state;
        if (dto.price !== undefined) updateData.price = dto.price;
        if (dto.features !== undefined) updateData.features = dto.features;
        if (dto.duration !== undefined) updateData.duration = dto.duration;
        if (dto.priority !== undefined) updateData.priority = dto.priority;
        if (dto.imageCount !== undefined) updateData.imageCount = dto.imageCount;
        if (dto.videoCount !== undefined) updateData.videoCount = dto.videoCount;

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        return {
            id: updatedDoc.id,
            ...updatedDoc.data()
        };
    }

    async deletePlan(id: string, userRole: UserRole) {
        if (userRole !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can delete plans');
        }

        const collection = this.getPlanCollection();
        const docRef = collection.doc(id);

        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        const plan = doc.data() as Plan;
        if (!this.isPlanVisible(plan)) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        await docRef.update({
            isDeleted: true,
            updatedAt: firestore.FieldValue.serverTimestamp(),
        });

        return {
            message: `Plan with ID ${id} has been successfully deleted`,
            id: id
        };
    }
    async getPlanById(id: string) {
        const collection = this.getPlanCollection();
        const docRef = collection.doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }
        const plan = doc.data() as Plan;
        if (!this.isPlanVisible(plan)) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }
        return {
            id: doc.id,
            ...plan
        };
    }

    public async checkActiveAndGetDetails(id: string) {
        const doc = await this.getPlanCollection().doc(id).get();
        const plan = doc.data() as Plan | undefined;

        if (!doc.exists || !this.isPlanVisible(plan)) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }

        if (plan?.state !== 'ACTIVE') {
            throw new BadRequestException(`Plan with ID ${id} is not active`);
        }

        return {
            planName: plan.planName,
            planCode: plan.planCode,
            features: plan.features,
            imageCount: plan.imageCount,
            videoCount: plan.videoCount,
        };
    }


}
