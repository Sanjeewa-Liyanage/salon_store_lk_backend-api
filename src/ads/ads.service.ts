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
import { PaymentService } from '../payment/payment.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class AdsService {
    constructor(private firebaseService: FirebaseService,
                private planService: PlanService,
                private salonService: SalonService,
                private paymentService: PaymentService,
                private notificationsGateway: NotificationsGateway
                ){}

    private getCollection(){
        return this.firebaseService.getFirestore().
            collection('ads').
            withConverter(adConverter);
    }

    private async getSalonNameMap(salonIds: string[]): Promise<Map<string, string>> {
        const uniqueSalonIds = [...new Set(salonIds.filter(Boolean))];
        const salonNameMap = new Map<string, string>();

        await Promise.all(
            uniqueSalonIds.map(async (salonId) => {
                try {
                    const salonDoc = await this.firebaseService
                        .getFirestore()
                        .collection('salons')
                        .doc(salonId)
                        .get();

                    const salonData = salonDoc.data() as { salonName?: string } | undefined;
                    salonNameMap.set(salonId, salonData?.salonName ?? 'Unknown Salon');
                } catch {
                    salonNameMap.set(salonId, 'Unknown Salon');
                }
            }),
        );

        return salonNameMap;
    }

    private mapAdWithSalonName<T extends { salonId?: string }>(ad: T, salonNameMap: Map<string, string>) {
        const { salonId, ...adWithoutSalonId } = ad as T & Record<string, any>;

        return {
            ...adWithoutSalonId,
            salonName: salonId ? salonNameMap.get(salonId) ?? 'Unknown Salon' : 'Unknown Salon',
        };
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
            // send notification to admin
            const salonName = await this.salonService.getSalonById(dto.salonId);
            this.notificationsGateway.sendToAdmin('ad-submitted', {
                salonName: salonName.salonName,
                adId: docRef.id,
                message: `New ad submitted for salon ${salonName.salonName} with title ${dto.title}` // you can customize this message as needed
            })

            
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
        if(ad?.paymentStatus !== PaymentStatus.VERIFIED){
            throw new BadRequestException(`Ad payment is not verified current: ${ad?.paymentStatus})`);
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
        const salonNameMap = await this.getSalonNameMap(
            paginatedAds
                .map(ad => ad.salonId)
                .filter((salonId): salonId is string => Boolean(salonId)),
        );
        const adsWithSalonNames = paginatedAds.map(ad => this.mapAdWithSalonName(ad, salonNameMap));

        return {
            data: adsWithSalonNames,
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
    async getAdsBySalonId(salonId: string): Promise<any[]>{
        const collection = this.getCollection();
        const adsSnapshot = await collection.
            where('salonId', '==', salonId).
            orderBy('createdAt', 'desc').
            get();
        if(adsSnapshot.empty){
            return [];
        }
        const ads = adsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const salonNameMap = await this.getSalonNameMap([salonId]);
        return ads.map(ad => this.mapAdWithSalonName(ad, salonNameMap));
        
    }
    
    async getAdsAndPayment(adId: string): Promise<any>{
        const ad = await this.getAdById(adId);
        const payments = await this.paymentService.getPayamentsByreferenceId(adId);
        const salonNameMap = await this.getSalonNameMap(
            ad.salonId ? [ad.salonId] : [],
        );
        const adWithSalonName = this.mapAdWithSalonName({
            id: adId,
            ...ad,
        }, salonNameMap);
        
        return {
            ad: adWithSalonName,
            payments
        };
    }

    // Admin-only: Get all ads from the database
    async getAllAds(page?: number, limit?: number): Promise<any>{
        const collection = this.getCollection();
        
        try {
            let query: FirebaseFirestore.Query<Ad> = collection;
            
            // Get all ads ordered by creation date (newest first)
            query = query.orderBy('createdAt', 'desc');
            
            const adsSnapshot = await query.get();
            
            if (adsSnapshot.empty) {
                return {
                    data: [],
                    pagination: page !== undefined && limit !== undefined ? {
                        currentPage: page,
                        limit: limit,
                        totalItems: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    } : undefined
                };
            }
            
            const ads = adsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const salonNameMap = await this.getSalonNameMap(
                ads
                    .map(ad => ad.salonId)
                    .filter((salonId): salonId is string => Boolean(salonId)),
            );
            const adsWithSalonNames = ads.map(ad => this.mapAdWithSalonName(ad, salonNameMap));
            
            // If pagination parameters are provided, apply pagination
            if (page !== undefined && limit !== undefined) {
                const totalItems = adsWithSalonNames.length;
                const totalPages = Math.ceil(totalItems / limit);
                const offset = (page - 1) * limit;
                const paginatedAds = adsWithSalonNames.slice(offset, offset + limit);
                
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
                };
            }
            
            // Return all ads without pagination
            return {
                data: adsWithSalonNames,
                total: adsWithSalonNames.length
            };
        } catch (error) {
            console.error('Error getting all ads:', error);
            throw new BadRequestException('Failed to retrieve all ads');
        }
    }

    // Get ads filtered by status
    async getAdsByStatus(status: string, page?: number, limit?: number): Promise<any>{
        const collection = this.getCollection();
        
        try {
            // Validate status is a valid enum value
            if (!Object.values(AdStatus).includes(status as AdStatus)) {
                throw new BadRequestException(`Invalid status: ${status}. Valid statuses are: ${Object.values(AdStatus).join(', ')}`);
            }

            let query: FirebaseFirestore.Query<Ad> = collection;
            
            // Filter by status and order by creation date (newest first)
            query = query.where('status', '==', status).orderBy('createdAt', 'desc');
            
            const adsSnapshot = await query.get();
            
            if (adsSnapshot.empty) {
                return {
                    data: [],
                    status: status,
                    pagination: page !== undefined && limit !== undefined ? {
                        currentPage: page,
                        limit: limit,
                        totalItems: 0,
                        totalPages: 0,
                        hasNextPage: false,
                        hasPreviousPage: false
                    } : undefined
                };
            }
            
            const ads = adsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const salonNameMap = await this.getSalonNameMap(
                ads
                    .map(ad => ad.salonId)
                    .filter((salonId): salonId is string => Boolean(salonId)),
            );
            const adsWithSalonNames = ads.map(ad => this.mapAdWithSalonName(ad, salonNameMap));
            
            // If pagination parameters are provided, apply pagination
            if (page !== undefined && limit !== undefined) {
                const totalItems = adsWithSalonNames.length;
                const totalPages = Math.ceil(totalItems / limit);
                const offset = (page - 1) * limit;
                const paginatedAds = adsWithSalonNames.slice(offset, offset + limit);
                
                return {
                    data: paginatedAds,
                    status: status,
                    pagination: {
                        currentPage: page,
                        limit,
                        totalItems,
                        totalPages,
                        hasNextPage: page < totalPages,
                        hasPreviousPage: page > 1
                    }
                };
            }
            
            // Return all ads without pagination
            return {
                data: adsWithSalonNames,
                status: status,
                total: adsWithSalonNames.length
            };
        } catch (error) {
            console.error('Error getting ads by status:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Failed to retrieve ads by status');
        }
    }

    async getActiveAdById(id: string): Promise<{
        id: string;
        title?: string;
        description?: string;
        imageUrl?: string[];
        startDate?: Date;
        salonName: string;
    }>{
        const collection = this.getCollection();
        const docRef = collection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new BadRequestException(`Ad with ID ${id} not found`);
        }

        const ad = doc.data() as Ad;

        if (ad.status !== AdStatus.APPROVED) {
            throw new BadRequestException(`Ad with ID ${id} is not approved`);
        }

        const salonNameMap = await this.getSalonNameMap(
            ad.salonId ? [ad.salonId] : [],
        );

        return {
            id: doc.id,
            title: ad.title,
            description: ad.description,
            imageUrl: ad.imageUrl,
            startDate: ad.startDate,
            salonName: ad.salonId ? salonNameMap.get(ad.salonId) ?? 'Unknown Salon' : 'Unknown Salon',
        };
    }
    
}

