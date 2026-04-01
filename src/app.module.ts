import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { PlaygroundModule } from './playground/playground.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SalonModule } from './salon/salon.module';
import { AdsController } from './ads/ads.controller';
import { AdsService } from './ads/ads.service';
import { AdsModule } from './ads/ads.module';
import { PlanController } from './plan/plan.controller';
import { PlanService } from './plan/plan.service';
import { PlanModule } from './plan/plan.module';
import { PaymentModule } from './payment/payment.module';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    PlaygroundModule,
    AuthModule,
    UserModule,
    SalonModule,
    AdsModule,
    PlanModule,
    PaymentModule,
    DashboardModule
  ],
  controllers: [AppController, AdsController, PlanController, DashboardController],
  providers: [AppService, AdsService, PlanService, DashboardService],
})
export class AppModule {}
