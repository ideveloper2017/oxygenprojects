import { Module } from '@nestjs/common';
import { CaisherService } from './caisher.service';
import { CaisherController } from './caisher.controller';

@Module({
  controllers: [CaisherController],
  providers: [CaisherService],
})
export class CaisherModule {}
