import { Module } from '@nestjs/common';
import { CaisherService } from './caisher.service';
import { CaisherController } from './caisher.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caisher } from './entities/caisher.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Caisher])],
  controllers: [CaisherController],
  providers: [CaisherService],
})
export class CaisherModule {}
