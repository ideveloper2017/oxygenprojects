import { Module } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { ApartmentsController } from './apartments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apartments } from './entities/apartment.entity';
import { OrderItems } from '../order-items/entities/order-item.entity';
import { Orders } from '../orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Apartments, OrderItems, Orders])],
  providers: [ApartmentsService],
  controllers: [ApartmentsController],
  exports: [TypeOrmModule],
})
export class ApartmentsModule {}
