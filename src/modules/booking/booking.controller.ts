import {Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards} from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from "../auth/jwt-auth.guard";
import {AuthUser} from "../../common/decorators/auth-user.decorator";

@ApiTags('Bookings')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({summary: "Booking apartment"})
  @Post('/new-booking')
  create(@AuthUser() user_id:any,@Body() createBookingDto: BookingDto) {
    return this.bookingService.bookingApartment(createBookingDto).then(data => {
      if(data) {
        return {success: true, data, message: "New booking"}
      }else {
        return {success: false , message: "error while booking"}
        
      }
    })
  }

  @ApiOperation({summary: "All booked Apartments"})
  @Get('/all')
  findAll(@Query('page') page: number) {
    const limit: number = 20
    const offset = (page - 1) * limit;
    return this.bookingService.findAllBookings(offset, limit).then(data => {
      if(data.length != 0) {
        return {success: true,  message: "Bookings", data}
      }else {
        return {success: false,  message: "Bookings not found"}

      }
    })
  }

  @ApiOperation({summary: "Get Booked Apartment"})
  @Get(':apartment_id')
  findOne(@Param('apartment_id') apartment_id: number) {
    return this.bookingService.findOne(apartment_id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(+id);
  }

  @ApiOperation({summary: "Bronni bekor qilish"})
  @Post('/cancel')
  cencelBooking(@Body() bronIDs: number[]){
    return this.bookingService.cancelBooking(bronIDs)
  }

}
