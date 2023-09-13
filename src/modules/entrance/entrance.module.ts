import { Module } from '@nestjs/common';
import { EntrancesController } from './entrance.controller';
import { EntrancesService } from './entrance.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entrance } from "./entities/entrance.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Entrance])],
  controllers: [EntrancesController],
  providers: [EntrancesService],
  exports: [TypeOrmModule],
})
export class EntranceModule {}
