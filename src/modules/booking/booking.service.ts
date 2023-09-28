import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { BookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Clients } from '../clients/entities/client.entity';
import { Users } from '../users/entities/user.entity';
import { Booking } from './entities/booking.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Apartments } from '../apartments/entities/apartment.entity';
import { ApartmentStatus } from 'src/common/enums/apartment-status';

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
    booking.bron_date = bookingDto.bron_date? bookingDto.bron_date:  new Date();
    booking.bron_expires = bookingDto.bron_expires;
    booking.bron_is_active = true;

    if (booking.apartments.status === ApartmentStatus.FREE) {
      booking.apartments.status = ApartmentStatus.BRON;
      await booking.apartments.save();

      savedBooking = await this.bookingsRepository.save(booking);
    } else {
      throw new NotFoundException('this apartment can not  booked');
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

  async findOne(apartment_id: number) {
    try{
      const booking = await this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.clients', 'client')
      .leftJoinAndSelect('booking.apartments', 'apartment')
      .where('booking.bron_is_active = :isActive', { isActive: true })
      .andWhere('apartment.id = :apartment_id', {apartment_id})
      .getOne()

      if(booking){
        return {status:200 ,data:booking, message:"Booked apartment"};
      
      }else {
        return {status:404, message:"Booked apartment not found"};
      }

    }catch (error){
      
      return {status:error.code,message:error.message};
    }

  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
