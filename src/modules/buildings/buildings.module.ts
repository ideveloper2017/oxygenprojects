import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { Buildings } from './entities/building.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingItems } from './entities/buildingitems.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Buildings, BuildingItems])],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [TypeOrmModule],
})
export class BuildingsModule {}
