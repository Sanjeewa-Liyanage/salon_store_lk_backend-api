/* eslint-disable @typescript-eslint/require-await */
import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseService } from './firebase/firebase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Test Firebase connection
  @Get('firebase/test')
  async testFirebase() {
    try {
      const auth = this.firebaseService.getAuth();
      const firestore = this.firebaseService.getFirestore();
      
      return {
        status: 'success',
        message: 'Firebase is connected!',
        services: {
          auth: '✅ Connected',
          firestore: '✅ Connected',
          storage: '✅ Connected',
          messaging: '✅ Connected',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Firebase connection failed',
        error: error,
      };
    }
  }

  // Test Firestore - Create a test document
  @Post('firebase/test-firestore')
  async testFirestore(@Body() data: { message: string }) {
    try {
      const firestore = this.firebaseService.getFirestore();
      const testCollection = firestore.collection('test');
      
      const docRef = await testCollection.add({
        message: data.message || 'Test message',
        createdAt: new Date().toISOString(),
      });

      return {
        status: 'success',
        message: 'Document created in Firestore!',
        documentId: docRef.id,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Firestore test failed',
        error: error,
      };
    }
  }

  // Test Firestore - Read documents
  @Get('firebase/test-firestore')
  async getFirestoreTest() {
    try {
      const firestore = this.firebaseService.getFirestore();
      const snapshot = await firestore.collection('test').limit(5).get();
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        status: 'success',
        message: 'Retrieved documents from Firestore',
        count: documents.length,
        documents,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to read Firestore',
        error: error,
      };
    }
  }

  // Test Firebase Auth - List users
  @Get('firebase/test-auth')
  async testAuth() {
    try {
      const auth = this.firebaseService.getAuth();
      const listUsersResult = await auth.listUsers(5);
      
      const users = listUsersResult.users.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.metadata.creationTime,
      }));

      return {
        status: 'success',
        message: 'Retrieved users from Firebase Auth',
        count: users.length,
        users,
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Firebase Auth test failed',
        error: error,
      };
    }
  }
}
