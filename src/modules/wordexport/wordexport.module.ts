import { Module } from '@nestjs/common';
import { WordexportService } from './wordexport.service';
import { WordexportController } from './wordexport.controller';

@Module({
  controllers: [WordexportController],
  providers: [WordexportService],
})
export class WordexportModule {}
