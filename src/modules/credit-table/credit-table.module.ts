import { Module } from '@nestjs/common';
import { CreditTableService } from './credit-table.service';
import { CreditTableController } from './credit-table.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditTable } from './entities/credit-table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreditTable])],
  controllers: [CreditTableController],
  providers: [CreditTableService],
  exports: [TypeOrmModule, CreditTableService],
})
export class CreditTableModule {}
