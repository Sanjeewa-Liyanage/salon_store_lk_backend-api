import { BadRequestException, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { adConverter } from './helpers/ads.converter';
import { AdsCreateDto } from './dto/adscreate.dto';
import { firestore } from 'firebase-admin';
import { PlanService } from '../plan/plan.service';
import { SalonService } from '../salon/salon.service';
import { Ad } from './schema/ads.schema';
import { AdStatus } from './enum/adstatus.enum';
import { PaymentStatus } from './enum/paymentstat.enum';
import { start } from 'repl';

@Injectable()
export class AdsService {
    constructor(private firebaseService: FirebaseService,
                private planService: PlanService,
                private salonService: SalonService,
                ){}

    private getCollection(){
        return this.firebaseService.getFirestore().
            collection('ads').
            withConverter(adConverter);
    }

    async createAd(dto : AdsCreateDto, userId: string){
        const collection = this.getCollection();

        //check plan is active or not 
        const isPlanActive = await this.planService.checkActive(dto.planId);
        
        if (!isPlanActive) {
            throw new BadRequestException(`Plan is not active or does not exist`);
        }
        //check salon is ready to post ad or not
        await this.salonService.validateSalonForAd(dto.salonId, userId);

        const adData = {
            ...dto,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
            status: AdStatus.PENDING_APPROVAL,
            paymentStatus: PaymentStatus.NOTVERIFIED,
            startDate: undefined,
            endDate: undefined,
            approvalDate: undefined,
            rejectionReason: '',

            
            
        }
        
        try{
            const docRef = await collection.add(adData);
            
            return {
                message: 'Ad created successfully',
                adId: docRef.id,
                data: {
                    id: docRef.id,
                    ...dto
                }
            }
        }catch(error){
            console.error('Error creating ad:', error);
            throw new BadRequestException('Failed to create ad');
        }
    }

    //! bug fix : need to fix REJECTED ad can be approved 
    async approveAd(id: string):Promise<any>{
        const collection = this.getCollection();
        const docRef = collection.doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new BadRequestException(`Ad with ID ${id} not found`);
        }
        const ad = doc.data();
        if(ad?.status !== AdStatus.PENDING_APPROVAL){
            throw new BadRequestException(`Only ads with PENDING_APPROVAL status can be approved`);
        }
        const planId = ad?.planId;
        if(!planId){
            throw new BadRequestException(`Ad does not have a valid plan ID`);
        }
        const plan = await this.planService.getPlanById(planId);
        if(!plan?.duration || plan.duration <= 0){
            throw new BadRequestException(`Plan does not have a valid duration`);
        }
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000);
        await docRef.update({
            endDate: endDate,
            status: AdStatus.APPROVED,
            paymentStatus: PaymentStatus.VERIFIED,
            startDate: firestore.FieldValue.serverTimestamp(),
            approvalDate: firestore.FieldValue.serverTimestamp(),
            
        });
        return {
            message: 'Ad approved successfully',
            adId: id
        };
    }

    async rejectAd(id: string, reason: string):Promise<any>{
        const collection = this.getCollection();
        const docRef = collection.doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new BadRequestException(`Ad with ID ${id} not found`);
        }
        await docRef.update({
            status: AdStatus.REJECTED,
            rejectionReason: reason
        });
        return {
            message: 'Ad rejected successfully',
            adId: id
        };
    }

    async getAdById(id: string): Promise<Ad>{
        const collection = this.getCollection();
        const docRef = collection.doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new BadRequestException(`Ad with ID ${id} not found`);
        }
        return doc.data() as Ad;

    }

    //* get the ads with approved and verified payment and sort by plan priority and start date
    //todo need to sanitize the add data before sending to client
     
    async getAdsByPriority(page: number, limit: number){
        const collection = this.getCollection();
        const adsSnapshot = await collection.
            where('status', '==', AdStatus.APPROVED).
            where('paymentStatus', '==', PaymentStatus.VERIFIED).
            orderBy('startDate', 'desc').
            get();
        
        if(adsSnapshot.empty){
            return{
                data:[],
                pagination: {
                    currentPage: page,
                    limit: limit,
                    totalItems: 0,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPreviousPage: false
                }

            }
        }
        const ads = adsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        const uniquePlanIds = [...new Set(ads.map(ad => ad.planId).filter(Boolean))];

        const planMap = new Map<string, number>();
        await Promise.all(
            uniquePlanIds.map(async (planId) => {
                try{
                    if (planId) {
                        const plan = await this.planService.getPlanById(planId);
                        planMap.set(planId, plan?.priority ?? 3);
                    }
                }catch(error){
                    if (planId) {
                        planMap.set(planId, 3);
                    }
                }
            })
        );
        const sortedAds = ads.sort((a, b) => {
            const priorityA = a.planId ? planMap.get(a.planId) ?? 3 : 3;
            const priorityB = b.planId ? planMap.get(b.planId) ?? 3 : 3;
            return priorityA - priorityB;
        });
        const totalItems = sortedAds.length;
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;
        const paginatedAds = sortedAds.slice(offset, offset + limit);
        return {
            data: paginatedAds,
            pagination: {
                currentPage: page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }  
        }
    }

}
