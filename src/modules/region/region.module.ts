import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionsController } from './region.controller';
import { RegionsService } from './region.service';
import { Regions } from './entities/region.entity';
import { District } from '../district/entities/district.entity';
import { DistrictsService } from '../district/district.service';

@Module({
  imports: [TypeOrmModule.forFeature([Regions, District])],
  controllers: [RegionsController],
  providers: [RegionsService, DistrictsService],
  exports: [TypeOrmModule, RegionsService, DistrictsService],
})
export class RegionModule {}
