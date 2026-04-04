import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GeocodingService } from '../common/services/geocoding.service';
import { FirebaseService } from '../firebase/firebase.service';
import { salonConverter } from './helpers/salon.converter';
import { SalonCreateDto } from './dto/salon-create.dto';
import { SalonStatus } from './enum/salonstatus.enum';
import { UserService } from '../user/user.service';
import { ResendMailService } from '../common/mail/resendmail.service';
import { UserRole } from '../user/enum/userrole.enum';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class SalonService {
    private readonly logger = new Logger(SalonService.name);

    constructor(
        private geocodingService: GeocodingService,
        private firebaseService: FirebaseService,
        private userService: UserService,
        private resendMailService: ResendMailService,
        private notificationsGateway: NotificationsGateway,
    ){}

    private getSalonsCollection(){
        return this.firebaseService.getFirestore()
            .collection('salons')
            .withConverter(salonConverter);

    }

    private toFirestorePlain<T>(value: T): T {
        if (value === null || value === undefined) {
            return value;
        }

        if (value instanceof Date) {
            return value;
        }

        if (Array.isArray(value)) {
            return value.map((item) => this.toFirestorePlain(item)) as T;
        }

        if (typeof value === 'object') {
            const plainObject: Record<string, unknown> = {};
            Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
                if (nestedValue !== undefined) {
                    plainObject[key] = this.toFirestorePlain(nestedValue);
                }
            });
            return plainObject as T;
        }

        return value;
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

        const owner = await this.userService.findOne(ownerId);
        if (!owner) {
            throw new NotFoundException('Owner not found');
        }

        if (owner.role !== UserRole.SALON_OWNER) {
            throw new ForbiddenException('Only salon owners can create salons');
        }

        //check owner is verified or not

       const isVerifiedOwner = await this.userService.checkVerified(ownerId);
       if(!isVerifiedOwner){
            throw new ForbiddenException("Owner is Not Verified")
       }
        

        const coordinates = await this.geocodingService.getCoordinates(dto.address, dto.city);
        const contactInfo = dto.contactInfo ?? (dto.phoneNumber ? { phoneNumber: dto.phoneNumber } : undefined);
        const phoneNumber = contactInfo?.phoneNumber ?? dto.phoneNumber;

        if (!phoneNumber) {
            throw new BadRequestException('A contact phone number is required');
        }

        const salonData: any = {
            ...dto,
            phoneNumber,
            contactInfo,
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

        const firestoreSalonData = this.toFirestorePlain(salonData);
        const docRef = await collection.add(firestoreSalonData);

        // Send real-time notification to admins
        const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Unknown Owner';
        const createdAt = new Date();
        const notificationPayload = {
            salonId: docRef.id,
            salonName: dto.salonName,
            ownerName,
            createdAt: createdAt.toISOString(),
            message: `New salon "${dto.salonName}" created by ${ownerName} at ${createdAt.toLocaleString()}`,
        };

        try {
            const delivery = await this.notificationsGateway.sendToAdmin('salon-created', notificationPayload);
            if (delivery.recipientCount === 0) {
                this.logger.warn(
                    `Salon ${docRef.id} notification sent with 0 admin recipients (${delivery.adminRoomConnections} sockets currently in admin_room)`,
                );
            }
        } catch (error) {
            this.logger.warn(
                `Salon ${docRef.id} created, but failed to emit salon-created notification: ${error instanceof Error ? error.message : String(error)}`,
            );
            if (error instanceof Error && error.stack) {
                this.logger.debug(error.stack);
            }
        }

        return { message: 'Salon created successfully',
            salonId: docRef.id,
            result: firestoreSalonData
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
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }

        const existingSalon = salonDoc.data();
        const mergedContactInfo = dto.contactInfo
            ? {
                ...(existingSalon?.contactInfo ?? {}),
                ...dto.contactInfo,
                ...(dto.phoneNumber ? { phoneNumber: dto.phoneNumber } : {}),
            }
            : dto.phoneNumber
                ? {
                    ...(existingSalon?.contactInfo ?? {}),
                    phoneNumber: dto.phoneNumber,
                }
                : undefined;

        const phoneNumber = dto.phoneNumber ?? mergedContactInfo?.phoneNumber;
        const SalonData: any ={
            ...dto,
            ...(mergedContactInfo ? { contactInfo: mergedContactInfo } : {}),
            ...(phoneNumber ? { phoneNumber } : {}),
            updatedAt: new Date(),
        };

        if (SalonData.phoneNumber === undefined) {
            delete SalonData.phoneNumber;
        }
        if (SalonData.contactInfo === undefined) {
            delete SalonData.contactInfo;
        }

        const firestoreUpdateData = this.toFirestorePlain(SalonData);
        await collection.doc(id).update(firestoreUpdateData);
        return { message: 'Salon updated successfully', result: firestoreUpdateData };
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

    async getAllSalons(page = 1, limit = 10, type?: string) {
        if (page < 1) {
            throw new BadRequestException('Page must be greater than or equal to 1');
        }
        if (limit < 1 || limit > 100) {
            throw new BadRequestException('Limit must be between 1 and 100');
        }

        const collection = this.getSalonsCollection();

        const typeToStatusMap: Record<string, SalonStatus> = {
            active: SalonStatus.ACTIVE,
            suspended: SalonStatus.SUSPENDED,
            rejected: SalonStatus.REJECTED,
            pending: SalonStatus.PENDING_VERIFICATION,
            inactive: SalonStatus.INACTIVE,
        };

        const normalizedType = type?.toLowerCase().trim();
        const filterStatus = normalizedType
            ? typeToStatusMap[normalizedType]
            : undefined;

        if (normalizedType && !filterStatus) {
            throw new BadRequestException('Invalid type. Allowed values: active, suspended, rejected, pending, inactive');
        }

        let query: FirebaseFirestore.Query = collection;
        if (filterStatus) {
            query = query.where('status', '==', filterStatus);
        }

        const totalSnapshot = await query.get();
        const totalItems = totalSnapshot.size;
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;

        const snapshot = await query
            .orderBy('createdAt', 'desc')
            .offset(offset)
            .limit(limit)
            .get();

        const hasNext = page < totalPages;
        const hasPrevious = page > 1;
        const salonDocs: Array<Record<string, any>> = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Record<string, any>),
        }));

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
                totalItems,
                totalPages,
                hasPrevious,
                hasNext,
            },
        };
    }

    async getPendingSalons(page = 1, limit = 10) {
        return this.getAllSalons(page, limit, 'pending');
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
