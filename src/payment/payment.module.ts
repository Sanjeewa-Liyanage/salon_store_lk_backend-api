// payment/payment.module.ts
import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { SalonModule } from '../salon/salon.module';
import { generateTransactionId } from './helpers/transaction-id-generator.helper';

@Module({
    imports: [FirebaseModule, SalonModule],
    controllers: [PaymentController],
    providers: [
        PaymentService,
        {
            provide: 'GENERATE_TRANSACTION_ID',
            useValue: generateTransactionId,
        },
    ],
    exports: [PaymentService, 'GENERATE_TRANSACTION_ID'],
})
export class PaymentModule {}