import { Module } from '@nestjs/common';
import { TaskSchedulerService } from './task-scheduler.service';
import { TaskSchedulerController } from './task-scheduler.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apartments } from '../apartments/entities/apartment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Apartments])],
  controllers: [TaskSchedulerController],
  providers: [TaskSchedulerService],
})
export class TaskSchedulerModule {}
