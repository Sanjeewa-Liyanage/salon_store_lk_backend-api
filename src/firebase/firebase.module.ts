import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Global() // Makes it available throughout your app
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
