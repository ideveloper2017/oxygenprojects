import {forwardRef, Module} from '@nestjs/common';
import { WordexportController } from './wordexport.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Orders} from "../orders/entities/order.entity";
import {CurrenciesModule} from "../currencies/currencies.module";
import {FileUploadModule} from "../file-upload/file-upload.module";


@Module({
  imports:[TypeOrmModule.forFeature([Orders]), forwardRef(() =>CurrenciesModule),FileUploadModule],
  controllers: [WordexportController],


})
export class WordexportModule {}
