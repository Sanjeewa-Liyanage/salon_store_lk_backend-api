import { Module } from '@nestjs/common';
import { SalonController } from './salon.controller';
import { SalonService } from './salon.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [FirebaseModule, UserModule],
  controllers: [SalonController],
  providers: [SalonService, GeocodingService],
  exports: [SalonService]
})
export class SalonModule {}

