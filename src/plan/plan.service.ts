import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { planConverter } from './helpers/plan.conver';
import { PlanCreateDto } from './dto/plancreate.dto';
import { PlanUpdateDto } from './dto/plan-update.dto';
import { firestore } from 'firebase-admin';

@Injectable()
export class PlanService {
    constructor(private firebaseService:FirebaseService) {}

    private getPlanCollection() {
        return this.firebaseService.getFirestore()
            .collection('plans').withConverter(planConverter);
            
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

    async createPlan(dto: PlanCreateDto){
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
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
        };
        
        const docRef = await collection.add(newPlan);
        
        return {
            id: docRef.id,
            ...newPlan,
            planCode: planCode
        };
    }
    async getPlans(){
        const collection = this.getPlanCollection();
        const snapshot = await collection.get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            planName: doc.data().planName
        }));
    }

    async getAllPlans(page: number = 1, limit: number = 10) {
        const collection = this.getPlanCollection();
        
        // Get total count
        const totalSnapshot = await collection.get();
        const totalCount = totalSnapshot.size;
        
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
        const allDocs = totalSnapshot.docs;
        const paginatedDocs = allDocs.slice(offset, offset + limit);
        
        const data = paginatedDocs.map(doc => ({
            id: doc.id,
            ...doc.data()
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
        
        await docRef.update(updateData);
        
        const updatedDoc = await docRef.get();
        return {
            id: updatedDoc.id,
            ...updatedDoc.data()
        };
    }

    async deletePlan(id: string) {
        const collection = this.getPlanCollection();
        const docRef = collection.doc(id);
        
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new NotFoundException(`Plan with ID ${id} not found`);
        }
        
        await docRef.delete();
        
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
        return {
            id: doc.id,
            ...doc.data()
        };
    }
    
    public async checkActive (id:string): Promise<boolean> {
        const doc = await this.getPlanCollection().doc(id).get();
        return doc.exists && doc.data()?.state === 'ACTIVE';
    }
}
