import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { BookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Clients } from '../clients/entities/client.entity';
import { Users } from '../users/entities/user.entity';
import { Booking } from './entities/booking.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apartments } from '../apartments/entities/apartment.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  async bookingApartment(bookingDto: BookingDto) {
    let savedBooking;
    const booking = new Booking();
    booking.clients = await Clients.findOne({
      where: { id: +bookingDto.client_id },
    });
    booking.users = await Users.findOne({
      where: { id: +bookingDto.user_id },
    });
    booking.apartments = await Apartments.findOne({
      where: { id: +bookingDto.apartment_id },
    });
    booking.bron_amount = bookingDto.bron_amount;
    booking.bron_date = new Date();
    booking.bron_expires = bookingDto.bron_expires;
    booking.bron_is_active = true;

    if (booking.apartments.status === 'free') {
      booking.apartments.status = 'bron';
      await booking.apartments.save();

      savedBooking = await this.bookingsRepository.save(booking);
    } else {
      throw new NotFoundException('this apartment is already booked');
    }

    return savedBooking;
  }

  async findAllBookings(offset: number, limit: number) {
    const booking = await this.bookingsRepository.find({
      where: { bron_is_active: true },
      relations: ['apartments', 'clients'],
      skip: offset,
      take: limit,
      order: {'created_at': 'DESC'}
    });
    
    return booking;
  }

  async findOne(id: number) {
    let appartment;

    appartment=Apartments.findOne({where:{id:id}});

    const booking = await this.bookingsRepository.find({
      where: { bron_is_active: true, apartments: appartment },
      relations:['clients','apartments']
    });

    return booking;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
