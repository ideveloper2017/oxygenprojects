import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payments } from './entities/payment.entity';
import { PaymentOut } from './entities/paymentout.entity';
import {Orders} from "../orders/entities/order.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Payments, PaymentOut,Orders])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [TypeOrmModule, PaymentsService]
})
export class PaymentsModule {}
