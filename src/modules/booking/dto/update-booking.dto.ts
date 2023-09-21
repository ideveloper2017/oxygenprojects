import { PartialType } from '@nestjs/swagger';
import { BookingDto } from './create-booking.dto';

export class UpdateBookingDto extends PartialType(BookingDto) {}
