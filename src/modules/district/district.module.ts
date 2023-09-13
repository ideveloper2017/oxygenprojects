import { Module } from '@nestjs/common';

import { DistrictController } from './district.controller';
import { DistrictsService } from './district.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { District } from './entities/district.entity';

@Module({
  imports: [TypeOrmModule.forFeature([District])],
  controllers: [DistrictController],
  providers: [DistrictsService],
})
export class DistrictModule {}
