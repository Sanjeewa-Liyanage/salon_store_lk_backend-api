import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GeocodingService } from '../common/services/geocoding.service';
import { FirebaseService } from '../firebase/firebase.service';
import { salonConverter } from './helpers/salon.converter';
import { SalonCreateDto } from './dto/salon-create.dto';
import { SalonStatus } from './enum/salonstatus.enum';

@Injectable()
export class SalonService {
    constructor(
        private geocodingService: GeocodingService,
        private firebaseService: FirebaseService
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
    async getSalonById(id: string) {
        const collection = this.getSalonsCollection();
        return await collection.doc(id).get();
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

    async getAllSalons() {
        const collection = this.getSalonsCollection();
        const snapshot = await collection.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getSalonsByOwner(ownerId: string) {
        const collection = this.getSalonsCollection();
        const snapshot = await collection.where('ownerId', '==', ownerId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    async suspendSalon(id: string) {
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        await collection.doc(id).update({ 
            status: SalonStatus.SUSPENDED,
            updatedAt: new Date()
        });
        return { message: 'Salon suspended successfully', salonId: id };
    }

    async unsuspendSalon(id: string) {
        const collection = this.getSalonsCollection();
        const salonDoc = await collection.doc(id).get();
        if (!salonDoc.exists) {
            throw new NotFoundException('Salon not found');
        }
        await collection.doc(id).update({ 
            status: SalonStatus.ACTIVE,
            updatedAt: new Date()
        });
        return { message: 'Salon unsuspended successfully', salonId: id };
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
    
    
}
