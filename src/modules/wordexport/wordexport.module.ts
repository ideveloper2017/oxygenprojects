import {forwardRef, Module} from '@nestjs/common';
import { WordexportController } from './wordexport.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Orders} from "../orders/entities/order.entity";
import {CurrenciesModule} from "../currencies/currencies.module";


@Module({
  imports:[TypeOrmModule.forFeature([Orders]), forwardRef(() =>CurrenciesModule)],
  controllers: [WordexportController],


})
export class WordexportModule {}
