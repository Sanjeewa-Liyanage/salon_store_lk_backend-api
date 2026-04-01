import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { SalonStatus } from '../salon/enum/salonstatus.enum';
import { AdStatus } from '../ads/enum/adstatus.enum';
import { PaymentStatus } from '../payment/enum/paymentstatus.enum';
import { UserRole } from '../user/enum/userrole.enum';
import * as admin from 'firebase-admin';

@Injectable()
export class DashboardService {
    constructor(private readonly firebaseService: FirebaseService) {}

    async getAdminOverview() {
        const db = this.firebaseService.getFirestore();

        // Calculate a 30-day cutoff date for our charts
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

        try {
            // 1. Run aggregate queries (KPIs) AND fetch recent data concurrently
            const [
                totalSalons, pendingSalons, activeSalons,
                pendingAds, activeAds,
                pendingPayments,
                totalCustomers, totalSalonOwners,
                // Data for Charts & Activity
                plansSnapshot,
                recentAdsSnapshot,
                allSalonsSnapshot, // Assuming total salons (11) is small enough for in-memory grouping. If it grows to 10k+, you'll want to index/limit this.
                recentPaymentsSnapshot
            ] = await Promise.all([
                // KPIs using fast .count()
                db.collection('salons').count().get(),
                db.collection('salons').where('status', '==', SalonStatus.PENDING_VERIFICATION).count().get(),
                db.collection('salons').where('status', '==', SalonStatus.ACTIVE).count().get(),
                
                db.collection('ads').where('status', '==', AdStatus.PENDING_APPROVAL).count().get(),
                db.collection('ads').where('status', '==', AdStatus.APPROVED).count().get(),
                
                db.collection('payments').where('status', '==', PaymentStatus.PENDING_VERIFICATION).count().get(),

                db.collection('users').where('role', '==', UserRole.CUSTOMER).count().get(),
                db.collection('users').where('role', '==', UserRole.SALON_OWNER).count().get(),

                // Chart/Activity Data (fetching actual docs)
                db.collection('plans').get(),
                db.collection('ads').where('createdAt', '>=', thirtyDaysAgoTimestamp).orderBy('createdAt', 'desc').get(),
                db.collection('salons').get(), // Need city data for geographic distribution
                db.collection('payments').orderBy('createdAt', 'desc').limit(5).get()
            ]);

            

            //  Map Plans (to get prices and names for our ads)
            const plansMap = new Map();
            plansSnapshot.docs.forEach(doc => {
                const data = doc.data();
                plansMap.set(doc.id, { name: data.planName || 'Unknown Plan', price: data.price || 0 });
            });

            // B. Aggregate Ads by Plan
            const adsByPlanMap = new Map<string, number>();
            const latestApprovedAds: any[] = [];

            recentAdsSnapshot.docs.forEach(doc => {
                const ad = doc.data();
                const planId = ad.planId;
                const planDetails = plansMap.get(planId) || { name: 'Unknown', price: 0 };

                // Plan Distribution Chart
                const planName = planDetails.name;
                adsByPlanMap.set(planName, (adsByPlanMap.get(planName) || 0) + 1);

                // Collect recent approved ads
                if (ad.status === AdStatus.APPROVED) {
                    if (latestApprovedAds.length < 5) {
                        latestApprovedAds.push({ id: doc.id, title: ad.title, createdAt: ad.createdAt.toDate() });
                    }
                }
            });

            //  Aggregate Salons by City
            const salonsByCityMap = new Map<string, number>();
            const recentPendingSalons: any[] = [];
            
            allSalonsSnapshot.docs.forEach(doc => {
                const salon = doc.data();
                
                const city = salon.city || 'Unspecified';
                salonsByCityMap.set(city, (salonsByCityMap.get(city) || 0) + 1);

                
                if (salon.status === SalonStatus.PENDING_VERIFICATION && recentPendingSalons.length < 5) {
                    recentPendingSalons.push({
                        id: doc.id,
                        salonName: salon.salonName,
                        salonCode: salon.salonCode,
                        createdAt: salon.createdAt?.toDate(),
                    });
                }
            });

            
            const adsByPlan = Array.from(adsByPlanMap, ([planName, count]) => ({ planName, count }));
            
            const salonsByCity = Array.from(salonsByCityMap, ([city, count]) => ({ city, count }))
                .sort((a, b) => b.count - a.count); // Sort by highest count

            return {
                kpis: {
                    salons: {
                        total: totalSalons.data().count,
                        pendingVerification: pendingSalons.data().count,
                        active: activeSalons.data().count,
                    },
                    ads: {
                        pendingApproval: pendingAds.data().count,
                        activeApproved: activeAds.data().count,
                    },
                    payments: {
                        pendingVerification: pendingPayments.data().count,
                    },
                    users: {
                        customers: totalCustomers.data().count,
                        salonOwners: totalSalonOwners.data().count,
                    }
                },
                charts: {
                    adsByPlan,
                    salonsByCity
                },
                recentActivity: {
                    pendingSalons: recentPendingSalons,
                    latestApprovedAds,
                    recentPayments: recentPaymentsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        method: doc.data().paymentMethod,
                        status: doc.data().status,
                        createdAt: doc.data().createdAt?.toDate()
                    }))
                }
            };
        } catch (error) {
            console.error('Error fetching admin dashboard data:', error);
            throw new InternalServerErrorException('Failed to load dashboard statistics');
        }
    }
    async getOwnerOverview(ownerId: string) {
        const db = this.firebaseService.getFirestore();

        try {
            // Helper function to handle Firestore's 10-item limit on 'in' queries
            const chunkArray = <T>(arr: T[], size: number): T[][] =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                    arr.slice(i * size, i * size + size)
                );

            // 1. Fetch Salons for this specific owner
            const salonsSnapshot = await db.collection('salons').where('ownerId', '==', ownerId).get();
            const salons = salonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

            const salonIds = salons.map(s => s.id);
            const salonMap = new Map(salons.map(s => [s.id, s.salonName || 'Unknown Salon']));

            // Initialize KPIs
            const kpis = {
                salons: { total: salons.length, active: 0, pendingVerification: 0, suspended: 0 },
                ads: { total: 0, activeApproved: 0, pendingApproval: 0, rejected: 0 },
                payments: { pendingVerification: 0, rejected: 0 }
            };

            // Calculate Salon KPIs locally (avoids extra database reads)
            salons.forEach(s => {
                if (s.status === SalonStatus.ACTIVE) kpis.salons.active++;
                if (s.status === SalonStatus.PENDING_VERIFICATION) kpis.salons.pendingVerification++;
                if (s.status === SalonStatus.SUSPENDED) kpis.salons.suspended++;
            });

            // If the owner has no salons, return early with empty charts/activity
            if (salonIds.length === 0) {
                return {
                    kpis,
                    charts: { adsBySalon: [] },
                    recentActivity: { salons: [], ads: [], payments: [] }
                };
            }

            // 2. Fetch Ads related to these Salons
            const salonIdChunks = chunkArray(salonIds, 10);
            const adsPromises = salonIdChunks.map(chunk =>
                db.collection('ads').where('salonId', 'in', chunk).get()
            );
            const adsSnapshots = await Promise.all(adsPromises);

            const ads: any[] = [];
            adsSnapshots.forEach(snap => {
                snap.docs.forEach(doc => ads.push({ id: doc.id, ...doc.data() as any }));
            });

            const adIds = ads.map(a => a.id);
            const adsBySalonMap = new Map<string, number>();

            // Calculate Ad KPIs & Chart Data
            ads.forEach(ad => {
                kpis.ads.total++;
                if (ad.status === AdStatus.APPROVED) kpis.ads.activeApproved++;
                if (ad.status === AdStatus.PENDING_APPROVAL) kpis.ads.pendingApproval++;
                if (ad.status === AdStatus.REJECTED) kpis.ads.rejected++;

                // Data for "Ads per Salon" chart
                const salonName = salonMap.get(ad.salonId) || 'Unknown Salon';
                adsBySalonMap.set(salonName, (adsBySalonMap.get(salonName) || 0) + 1);
            });

            // 3. Fetch Payments related to these Ads
            const payments: any[] = [];
            if (adIds.length > 0) {
                const adIdChunks = chunkArray(adIds, 10);
                const paymentsPromises = adIdChunks.map(chunk =>
                    // payment service uses 'referenceId' to store the ad ID
                    db.collection('payments').where('referenceId', 'in', chunk).get() 
                );
                const paymentsSnapshots = await Promise.all(paymentsPromises);

                paymentsSnapshots.forEach(snap => {
                    snap.docs.forEach(doc => payments.push({ id: doc.id, ...doc.data() as any }));
                });

                // Calculate Payment KPIs
                payments.forEach(p => {
                    if (p.status === PaymentStatus.PENDING_VERIFICATION) kpis.payments.pendingVerification++;
                    if (p.status === PaymentStatus.REJECTED) kpis.payments.rejected++;
                });
            }

            // 4. Sort and format Recent Activity feeds (Top 5 newest)
            const safeToMillis = (timestamp: any) => timestamp?.toMillis ? timestamp.toMillis() : 0;
            const sortByDateDesc = (a: any, b: any) => safeToMillis(b.createdAt) - safeToMillis(a.createdAt);

            const recentSalons = salons.sort(sortByDateDesc).slice(0, 5).map(s => ({
                id: s.id,
                salonName: s.salonName,
                status: s.status,
                createdAt: s.createdAt?.toDate()
            }));

            const recentAds = ads.sort(sortByDateDesc).slice(0, 5).map(a => ({
                id: a.id,
                title: a.title,
                salonName: salonMap.get(a.salonId),
                status: a.status,
                createdAt: a.createdAt?.toDate()
            }));

            const recentPayments = payments.sort(sortByDateDesc).slice(0, 5).map(p => ({
                id: p.id,
                method: p.paymentMethod,
                status: p.status,
                createdAt: p.createdAt?.toDate()
            }));

            return {
                kpis,
                charts: {
                    adsBySalon: Array.from(adsBySalonMap, ([salonName, count]) => ({ salonName, count }))
                },
                recentActivity: {
                    salons: recentSalons,
                    ads: recentAds,
                    payments: recentPayments
                }
            };
        } catch (error) {
            console.error('Error fetching owner dashboard data:', error);
            throw new InternalServerErrorException('Failed to load owner dashboard statistics');
        }
    }
}