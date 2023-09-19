import { Module } from '@nestjs/common';
import { WordexportController } from './wordexport.controller';

@Module({
  controllers: [WordexportController],
})
export class WordexportModule {}
