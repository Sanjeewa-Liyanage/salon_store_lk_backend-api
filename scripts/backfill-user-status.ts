/**
 * One-time migration script: Backfill `status` field for existing users.
 *
 * Usage:
 *   npx ts-node scripts/backfill-user-status.ts
 *
 * Make sure your .env file is in the project root with the Firebase credentials.
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (same config as firebase.service.ts)
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});

const db = getFirestore(admin.app(), 'salon-store-lk');

async function backfillUserStatus() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log('No users found in Firestore.');
    return;
  }

  let updated = 0;
  let skipped = 0;
  const batch = db.batch();
  const BATCH_LIMIT = 500; // Firestore batch write limit

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip users that already have a status field
    if (data.status) {
      skipped++;
      continue;
    }

    // All existing users are active per user confirmation
    batch.update(doc.ref, {
      status: 'ACTIVE',
      isActive: true,
      isVerified: true,
    });

    updated++;

    // Firestore batches are limited to 500 operations
    if (updated % BATCH_LIMIT === 0) {
      await batch.commit();
      console.log(`  Committed batch of ${BATCH_LIMIT} updates...`);
    }
  }

  // Commit any remaining updates
  if (updated % BATCH_LIMIT !== 0) {
    await batch.commit();
  }

  console.log('');
  console.log('=== Migration Complete ===');
  console.log(`  Total users:   ${snapshot.size}`);
  console.log(`  Updated:       ${updated}`);
  console.log(`  Skipped:       ${skipped} (already had status)`);
}

backfillUserStatus()
  .then(() => {
    console.log('\nDone! You can now safely delete this script.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
