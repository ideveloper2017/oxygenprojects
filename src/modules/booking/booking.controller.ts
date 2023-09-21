import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Bookings')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('/new-booking')
  create(@Body() createBookingDto: BookingDto) {
    return this.bookingService.bookingApartment(createBookingDto).then(data => {
      if(data) {
        return {success: true, data, message: "New booking"}
      }else {
        return {success: false , message: "error while booking"}
        
      }
    })
  }

  @Get('/all')
  findAll() {
    return this.bookingService.findAll().then(data => {
      if(!data) {
        return {success: false,  message: "Bookings not found"}
      }else {
        return {success: true,  message: "Bookings", data}

      }
    })
  }

  @Get(':client_id')
  findOne(@Param('client_id') client_id: string) {
    return this.bookingService.findOne(+client_id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(+id);
  }
}
