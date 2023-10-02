import { Module } from '@nestjs/common';
import { TaskSchedulerService } from './task-scheduler.service';
import { TaskSchedulerController } from './task-scheduler.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apartments } from '../apartments/entities/apartment.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [TypeOrmModule.forFeature([Apartments]), 
  ScheduleModule.forRoot(),
],
  controllers: [TaskSchedulerController],
  providers: [TaskSchedulerService],
})
export class TaskSchedulerModule {}
