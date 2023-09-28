import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { OrdersModule } from '../orders/orders.module';
import { OrdersService } from '../orders/orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { PaymentsService } from '../payments/payments.service';
import { PaymentsModule } from '../payments/payments.module';
import { ApartmentsService } from '../apartments/apartments.service';

@Module({
  imports: [OrdersModule, PaymentsModule],
  controllers: [ReportController],
  providers: [ReportService, OrdersService, ApartmentsService],
})
export class ReportModule {}
