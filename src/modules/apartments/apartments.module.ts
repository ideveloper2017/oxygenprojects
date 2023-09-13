import { Module } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { ApartmentsController } from './apartments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apartments } from './entities/apartment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Apartments])],
  providers: [ApartmentsService],
  controllers: [ApartmentsController],
  exports: [TypeOrmModule],
})
export class ApartmentsModule {}
