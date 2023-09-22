import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { ApartmentsService } from './apartments.service';

@ApiTags('Apartments')
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @ApiOperation({ summary: "Binoga xonadon qo'shish" })
  @ApiResponse({
    status: 201,
    description: "Kvartira muvaffaqiyatli qo'shildi!",
  })
  @Post('/new/:floor_id')
  createApartment(
    @Param('floor_id') floor_id: number,
    @Body() createApartmentDto: CreateApartmentDto,
  ) {
    return this.apartmentsService.addOneApartment(floor_id, createApartmentDto);
  }

  @ApiOperation({ summary: 'Kvartira tahrirlash' })
  @ApiResponse({ status: 200, description: 'Kvartira tahrirlandi' })
  @Patch('/edit/:id')
  updateApartment(
    @Param('id') id: number,
    @Body() updateApartmentDto: UpdateApartmentDto,
  ) {
    return this.apartmentsService
      .updateApartment(id, updateApartmentDto)
      .then((data) => {
        if (data.affected == 0) {
          return { success: false, message: 'Kvartira topilmadi' };
        }
        return { success: true, message: 'Kvartira tahrirlandi' };
      })
      .catch((error) => console.log(error));
  }

  @ApiOperation({ summary: "Kvartirani ro'yxatdan o'chirish" })
  @ApiResponse({ status: 200, description: "Kvartira o'chilidi" })
  @Delete('/delete/:id')
  deleteApartment(@Param('id') id: number) {
    return this.apartmentsService
      .deleteApartment(id)
      .then((data) => {
        if (data !== null && data.affected != 0) {
          return { success: true, message: 'Apartment deleted' };
        } else {
          return { success: false, message: 'error while deleting apartment' };
        }
      })
      .catch((error) => console.log(error));
  }

  @ApiOperation({ summary: 'Bitta qavatdagi barcha kvartiralar' })
  @Get('/get/:floor_id')
  public getApartments(
    @Param('floor_id', ParseIntPipe) floor_id: number,
    res: Response,
  ) {
    return this.apartmentsService
      .getApartments(floor_id)
      .then((data) => {
        if (data.length != 0) {
          return { success: true, data, message: 'Fetched data' };
        } else {
          return { success: false, message: 'Not found record' };
        }
      })
      .catch((error) => console.log(error));
  }

  @ApiOperation({ summary: 'Kvartira bronlash' })
  @Patch('/bron/:apartment_id')
  bookingApartment(@Param('apartment_id') apartment_id: number) {
    return this.apartmentsService
      .bookingApartment(apartment_id)
      .then((data) => {
        if (data != null && data.affected != 0) {
          return { success: true, message: 'kvartira band qilindi' };
        } else {
          return { success: false, message: 'kvartira topilmadi' };
        }
      });
  }
  @ApiOperation({ summary: 'Kvartira malumotlarini olish' })
  @Get('/info/:id')
  apartmentInfo(@Param('id') id: number) {
    return this.apartmentsService.getOneApartment(id).then((data) => {
      if (data) {
        return { success: true, data, message: 'Apartment info' };
      } else {
        return { success: false, message: 'Apartment not found' };
      }
    });
  }

  @Get('/all')
  getAllApartments() {
    return this.apartmentsService.findAllApartments().then((data) => {
      if(data.length != 0 ){
        return { success: true, data, message: "All Apartments " };
      }else {
        return { success: false, message: "No data found" };

      }
    })
  }
  
  @Get('/booked')
  getBookedApartments(@Query('page') page: number) {
    const limit : number = 20
    const offset = (page-1) * limit
    
    return this.apartmentsService.findBookedApartments(offset, limit).then(data => {
      
      if(data.length > 0) {
        return {success: true, message:"Booked Apartments", data}
      }else {
        return {success: false, message:"No booked apartments found"}
    }
  })

  }


}
