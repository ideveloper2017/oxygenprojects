import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orders } from './entities/order.entity';
import { PaymentsService } from '../payments/payments.service';
import { Payments } from '../payments/entities/payment.entity';
import { PaymentOut } from '../payments/entities/paymentout.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Orders, Payments, PaymentOut])],
  controllers: [OrdersController],
  providers: [OrdersService, PaymentsService],
  exports: [TypeOrmModule],
})
export class OrdersModule {}
