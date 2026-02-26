import { BadRequestException, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { adConverter } from './helpers/ads.converter';
import { AdsCreateDto } from './dto/adscreate.dto';
import { firestore } from 'firebase-admin';
import { PlanService } from '../plan/plan.service';
import { SalonService } from '../salon/salon.service';

@Injectable()
export class AdsService {
    constructor(private firebaseService: FirebaseService,
                private planService: PlanService,
                private salonService: SalonService){}

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
    
    

}
