import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GeocodingService } from '../common/services/geocoding.service';
import { FirebaseService } from '../firebase/firebase.service';
import { salonConverter } from './helpers/salon.converter';
import { SalonCreateDto } from './dto/salon-create.dto';
import { SalonStatus } from './enum/salonstatus.enum';
import { stat } from 'fs';
import { UserService } from '../user/user.service';
import { ResendMailService } from '../common/mail/resendmail.service';

@Injectable()
export class SalonService {
    constructor(
        private geocodingService: GeocodingService,
        private firebaseService: FirebaseService,
        private userService: UserService,
        private resendMailService: ResendMailService
    ){}

    private getSalonsCollection(){
        return this.firebaseService.getFirestore()
            .collection('salons')
            .withConverter(salonConverter);

    }

    private async generateSalonCode(): Promise<string>{
        const collection = this.getSalonsCollection();
        const year = new Date().getFullYear().toString().slice(-2);
        const prefix = `SAL-${year}`;
        const snapshot = await collection.where('salonCode', '>=', prefix).where('salonCode', '<', prefix + '\uf8ff').orderBy('salonCode', 'desc').limit(1).get();
        if (snapshot.empty) {
            return `${prefix}-0001`;
        }
        const lastSalon = snapshot.docs[0].data();
        const lastCode = lastSalon.salonCode;
        const lastNumber = parseInt(lastCode!.split('-')[2]);
        const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
        return `${prefix}-${nextNumber}`;


    }
    async createSalon(dto: SalonCreateDto, ownerId: string) {
        const collection = this.getSalonsCollection();
        //check owner is verified or not

       const isVerifiedOwner = await this.userService.checkVerified(ownerId);
       if(!isVerifiedOwner){
            throw new ForbiddenException("Owner is Not Verified")
       }
        

        const coordinates = await this.geocodingService.getCoordinates(dto.address, dto.city);

        const salonData: any = {
            ...dto,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            status: SalonStatus.PENDING_VERIFICATION,
            createdAt: new Date(),
            ownerId: ownerId,
        };
        if (coordinates) {
            salonData.location = coordinates;
        }

        const salonCode = await this.generateSalonCode();
        salonData.salonCode = salonCode;

        const docRef = await collection.add(salonData);
        return { message: 'Salon created successfully',
            salonId: docRef.id,
            result: salonData
         };
    }

    async getbyOwner(ownerId: string) {
        const collection = this.getSalonsCollection();
        const snapshot = await collection.where('ownerId', '==', ownerId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getSalonById(id: string) {
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        
        const salonData = salonDoc.data();
        let ownerName = 'Unknown';
        
        if (salonData?.ownerId) {
            const owner = await this.userService.findOne(salonData.ownerId);
            ownerName = owner 
                ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
                : 'Unknown';
        }
        
        return { id: salonDoc.id, ...salonData, ownerName };
    }

    
    
    async updateSalon(id: string, dto: Partial<SalonCreateDto>) {
        const collection = this.getSalonsCollection();
        const SalonData: any ={
            ...dto,
            updatedAt: new Date(),
        }
        await collection.doc(id).update(SalonData);
        return { message: 'Salon updated successfully', result: SalonData };
    }



    async deleteSalon(id: string, userId: string):Promise<any> {
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        const salonData = salonDoc.data();
        if (salonData?.ownerId !== userId) {
            throw new UnauthorizedException('You are not authorized to delete this salon');
        }
        await collection.doc(id).delete();
        return { message: 'Salon deleted successfully' };

    }

    async getAllSalons(page = 1, limit = 10) {
        if (page < 1) {
            throw new BadRequestException('Page must be greater than or equal to 1');
        }
        if (limit < 1 || limit > 100) {
            throw new BadRequestException('Limit must be between 1 and 100');
        }

        const collection = this.getSalonsCollection();
        const offset = (page - 1) * limit;
        const snapshot = await collection
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit + 1)
            .get();

        const hasNext = snapshot.docs.length > limit;
        const salonDocs = (hasNext ? snapshot.docs.slice(0, limit) : snapshot.docs)
            .map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch owner names for each salon
        const salons = await Promise.all(
            salonDocs.map(async (salon) => {
                let ownerName = 'Unknown';
                if (salon.ownerId) {
                    const owner = await this.userService.findOne(salon.ownerId);
                    ownerName = owner 
                        ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
                        : 'Unknown';
                }
                return {
                    ...salon,
                    ownerName,
                };
            })
        );

        return {
            data: salons,
            pagination: {
                page,
                limit,
                hasNext,
            },
        };
    }

    async getPendingSalons(page = 1, limit = 10) {
        if (page < 1) {
            throw new BadRequestException('Page must be greater than or equal to 1');
        }
        if (limit < 1 || limit > 100) {
            throw new BadRequestException('Limit must be between 1 and 100');
        }
        const collection = this.getSalonsCollection();
        const offset = (page - 1) * limit;
        const snapshot = await collection
            .where('status', '==', SalonStatus.PENDING_VERIFICATION)
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit + 1)
            .get();
        const hasNext = snapshot.docs.length > limit;
        const salonDocs = (hasNext ? snapshot.docs.slice(0, limit) : snapshot.docs)
            .map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch owner names for each salon
        const salons = await Promise.all(
            salonDocs.map(async (salon) => {
                let ownerName = 'Unknown';
                if (salon.ownerId) {
                    const owner = await this.userService.findOne(salon.ownerId);
                    ownerName = owner 
                        ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
                        : 'Unknown';
                }
                return {
                    ...salon,
                    ownerName,
                };
            })
        );

        return {
            data: salons,
            pagination: {
                page,
                limit,
                hasNext,
            },
        };
    }



    async getSalonsByOwner(ownerId: string) {
        const collection = this.getSalonsCollection();
        const snapshot = await collection.where('ownerId', '==', ownerId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async checkOwnership(id: string, userId: string): Promise<boolean> {
        const snapshot = await this.getSalonsCollection().doc(id).get();
        if (!snapshot.exists) {
            return false;
        }
        const salonData = snapshot.data();
        return salonData?.ownerId === userId;
    }


    
    //check salon is ready to post add
    async validateSalonForAd(salonId: string, userId: string): Promise<void> {
        const snapshot = await this.getSalonsCollection().doc(salonId).get();
        if (!snapshot.exists) {
            throw new NotFoundException('Salon not found');
        }

        const salon = snapshot.data();

        if (salon?.ownerId !== userId) {
            throw new UnauthorizedException('You are not authorized to create an ad for this salon');
        }
        if (salon?.status !== SalonStatus.ACTIVE) {
            throw new BadRequestException('Salon is not active please contact Support');
        }
    }



    async suspendSalon(id: string, reason: string) {
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        
        const salonData = salonDoc.data();
        await collection.doc(id).update({ 
            status: SalonStatus.SUSPENDED,
            suspensionReason: reason,
            updatedAt: new Date()
        });
        //? Send suspension email to owner

        if(salonData?.ownerId){
            const owner = await this.userService.findOne(salonData.ownerId);
            if(owner && owner.email){
                const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Salon Owner';
                const salonName = salonData.salonName || 'Your Salon';
                await this.resendMailService.sendSalonSuspensionEmail(
                        owner.email,
                        ownerName,
                        salonName,
                        reason,
                        new Date().toLocaleDateString(),
                    
                );
            }
        }
        return { message: 'Salon suspended successfully', salonId: id };
    }

    async unsuspendSalon(id: string) {
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        
        const salonData = salonDoc.data();
        await collection.doc(id).update({ 
            status: SalonStatus.ACTIVE,
            updatedAt: new Date()
        });

        // Send unsuspension email to owner
        if(salonData?.ownerId){
            const owner = await this.userService.findOne(salonData.ownerId);
            if(owner && owner.email){
                const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Salon Owner';
                const salonName = salonData.salonName || 'Your Salon';
                await this.resendMailService.sendSalonUnsuspensionEmail(
                    owner.email,
                    ownerName,
                    salonName
                );
            }
        }

        return { message: 'Salon unsuspended successfully', salonId: id };
    }

    async rejectSalon(id: string, reason: string){
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        
        const salonData = salonDoc.data();
        await collection.doc(id).update({
            status: SalonStatus.REJECTED,
            rejectionReason: reason,
            updatedAt: new Date()
        });

        // Send rejection email to owner
        if (salonData?.ownerId) {
            const owner = await this.userService.findOne(salonData.ownerId);
            if (owner && owner.email) {
                const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Salon Owner';
                const salonName = salonData.salonName || 'Your Salon';
                await this.resendMailService.sendSalonRejectionEmail(
                    owner.email,
                    ownerName,
                    salonName,
                    reason
                );
            }
        }

        return { message: 'Salon rejected successfully', salonId: id };
    }

    async updateSalonStatus(id: string, status: SalonStatus) {
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        await collection.doc(id).update({ 
            status: status,
            updatedAt: new Date()
        });
        return { message: `Salon status updated to ${status}`, salonId: id, status };
    }


    async activateSalon(id:string){
        const collection = this.getSalonsCollection(); 
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        await collection.doc(id).update({
            status: SalonStatus.ACTIVE,
            updatedAt: new Date()
        })
        return { message: 'Salon activated successfully'};
    }

    
    async getactiveallsalons(page = 1){
        if (page < 1) {
            throw new BadRequestException('Page must be greater than or equal to 1');
        }

        const limit = 10;
        const offset = (page - 1) * limit;
        const collection = this.getSalonsCollection();

        // Fetch active salons and all ads, then rank salons by ad volume.
        const [activeSalonsSnapshot, adsSnapshot] = await Promise.all([
            collection.where('status', '==', SalonStatus.ACTIVE).get(),
            this.firebaseService.getFirestore().collection('ads').get(),
        ]);

        const adCountBySalon = new Map<string, number>();
        adsSnapshot.docs.forEach((doc) => {
            const adData = doc.data() as { salonId?: string };
            if (!adData.salonId) {
                return;
            }
            adCountBySalon.set(adData.salonId, (adCountBySalon.get(adData.salonId) ?? 0) + 1);
        });

        const rankedSalons = activeSalonsSnapshot.docs
            .map((doc) => {
                const salonData = doc.data();
                const adCount = adCountBySalon.get(doc.id) ?? 0;
                return {
                    id: doc.id,
                    ...salonData,
                    adCount,
                };
            })
            .sort((a, b) => b.adCount - a.adCount);

        const totalItems = rankedSalons.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginatedSalons = rankedSalons.slice(offset, offset + limit);

        return {
            data: paginatedSalons,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
            },
        };
        
    }

    
    
}
