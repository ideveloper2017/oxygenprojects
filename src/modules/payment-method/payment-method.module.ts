import { Module } from '@nestjs/common';
import { PaymentMethodsService } from './payment-method.service';
import { PaymentMethodsController } from './payment-method.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethods } from './entities/payment-method.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethods])],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
  exports: [TypeOrmModule,PaymentMethodsService],
})
export class PaymentMethodModule {}
