import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Apartments } from '../apartments/entities/apartment.entity';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Booking } from '../booking/entities/booking.entity';
import { ApartmentStatus } from 'src/common/enums/apartment-status';

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

    // joriy vaqy ni olish
    const currentDate = new Date();

    //bron qilingan xonadonlarni topish qaysiyki bron muddati bugungi kundan kichik bolganlarini
    const bookings = await Booking.find({
      where: {
        bron_expires: LessThanOrEqual(currentDate),
        bron_is_active: true,
      },
    });

    // bron bo'lgan xonadonlarning bron muddati tugaganlarini bronini berkor qilish va xonadonni bo'sh holatga keltirish
    for (const booking of bookings) {
      booking.bron_is_active = false;
      await Booking.save(booking);

      // bron qilingan xonadon ni topishva va statusini free ga almashtirish
      const apartment = await this.apartmentRepository.findOne({
        where: { id: booking.apartments.id },
      });

      if (apartment) {
        apartment.status = ApartmentStatus.FREE;
        await this.apartmentRepository.save(apartment);
      } else {
        continue;
      }
    }

    this.logger.log('Apartment status check completed.');
  }
}
