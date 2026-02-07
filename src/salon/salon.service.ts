import { Injectable } from '@nestjs/common';
import { GeocodingService } from '../common/services/geocoding.service';
import { FirebaseService } from '../firebase/firebase.service';
import { salonConverter } from './helpers/salon.converter';
import { SalonCreateDto } from './dto/salon-create.dto';

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
    async createSalon(dto: SalonCreateDto, ownerId: string) {
        const collection = this.getSalonsCollection();

        const coordinates = await this.geocodingService.getCoordinates(dto.address, dto.city);

        const salonData: any = {
            ...dto,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            createdAt: new Date(),
            ownerId: ownerId,
        };
        if (coordinates) {
            salonData.location = coordinates;
        }

        await collection.add(salonData);
        return { message: 'Salon created successfully',
            result: salonData
         };
    }
    
}
