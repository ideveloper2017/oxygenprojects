import { Module } from '@nestjs/common';
import { WordexportController } from './wordexport.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Orders} from "../orders/entities/order.entity";

@Module({
  imports:[TypeOrmModule.forFeature([Orders])],
  controllers: [WordexportController],

})
export class WordexportModule {}
