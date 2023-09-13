import { Module } from '@nestjs/common';
import { FloorsService } from './floor.service';
import { FloorsController } from './floor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Floor } from './entities/floor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Floor])],
  controllers: [FloorsController],
  providers: [FloorsService],
  exports: [TypeOrmModule],
})
export class FloorModule {}
