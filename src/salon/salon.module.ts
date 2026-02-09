import { Module } from '@nestjs/common';
import { SalonController } from './salon.controller';
import { SalonService } from './salon.service';
import { GeocodingService } from '../common/services/geocoding.service';

@Module({
  controllers: [SalonController],
  providers: [SalonService, GeocodingService],
  exports: [SalonService]
})
export class SalonModule {}

