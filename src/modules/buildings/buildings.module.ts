import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { Apartments } from '../apartments/entities/apartment.entity';
import { Buildings } from './entities/building.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Buildings, Apartments])],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [TypeOrmModule],
})
export class BuildingsModule {}
