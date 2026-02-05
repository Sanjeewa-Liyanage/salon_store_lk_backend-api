import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore'; // Add this import

@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: privateKey,
        }),
        // eslint-disable-next-line prettier/prettier
        storageBucket: this.configService.get<string>('FIREBASE_STORAGE_BUCKET'),
      });

      console.log('✅ Firebase Admin initialized successfully');
    }
  }

  // Get Firebase Auth instance
  getAuth(): admin.auth.Auth {
    return admin.auth();
  }

  // Get Firestore instance
  getFirestore() {
    // Use the imported getFirestore helper which supports database ID
    return getFirestore(admin.app(), 'salon-store-lk');
  }

  // Get Storage instance
  getStorage(): admin.storage.Storage {
    return admin.storage();
  }

  // Get Messaging instance (for push notifications)
  getMessaging(): admin.messaging.Messaging {
    return admin.messaging();
  }
}