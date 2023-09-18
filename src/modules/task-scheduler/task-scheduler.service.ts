import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Apartments } from '../apartments/entities/apartment.entity';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TaskSchedulerService {
  constructor(
    @InjectRepository(Apartments)
    private readonly apartmentRepository: Repository<Apartments>,
  ) {}

  private readonly logger = new Logger(TaskSchedulerService.name);

  @Cron('0 0 * * *') // Run every day at midnight
  async checkAndChangeApartmentStatus(): Promise<void> {
    this.logger.log('Running apartment status check...');

    const apartments = await this.apartmentRepository.find({
      where: { status: 'bron' },
    });

    const currentDate = new Date();
    const threeDaysAgo = new Date(
      currentDate.getTime() - 3 * 24 * 60 * 60 * 1000,
    );

    for (const apartment of apartments) {
      if (apartment.updated_at && apartment.updated_at < threeDaysAgo) {
        apartment.status = 'free';
        await this.apartmentRepository.save(apartment);

        this.logger.log(`Apartment ${apartment.id} status changed to free.`);
      }
    }

    this.logger.log('Apartment status check completed.');
  }
}
