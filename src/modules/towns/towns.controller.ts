import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TownService } from './towns.service';
import { CreateTownDto } from './dto/create-town.dto';
import { UpdateTownDto } from "./dto/update-town.dto";

@ApiTags('Towns')
@Controller('town')
export class TownController {
  constructor(private readonly townService: TownService) {}

  @ApiOperation({
    summary: 'Yangi turar-joy yaratish',
    description: "ya'ni onyekt yaratish",
  })
  @Post('/add')
  createTown(@Body() createTownDto: CreateTownDto) {
    return this.townService.createTown(createTownDto);
  }

  @ApiOperation({ summary: "mavjud turar-joylarni ro'yxatini olish" })
  @Get('/all-one/:user_id/:id')
  getAllTowns(@Param('user_id') user_id: number, @Param('id') id: number) {
    return this.townService
      .findAllTowns(user_id, id)
      .then((data) => {
        if (data || data.length > 0) {
          return {
            success: true,
            data,
            message: 'Fetched data',
          };
        }else if(data === false){
          return { success: false, message: 'No data found' };
        }
        else {
           return { success: false, message: 'No data found' };
        }
      })
      .catch((error) => console.log(error));
  }

  @ApiOperation({ summary: 'Turar-joyni tahrirlash' })
  @Patch('/edit/:id')
  updateTown(@Param('id') id: number, @Body() updateTownDto: UpdateTownDto) {
    return this.townService
      .updateTown(id, updateTownDto)
      .then((data) => {
        if (data.affected == 0) {
          return { success: false, message: 'Turar-joy topilmadi!' };
        }
        return { success: true, message: 'Turar-joy tahrirlandi!' };
      })
      .catch((error) => console.log(error));
  }

  @ApiOperation({ summary: "Turar-joyni o'chirish" })
  @Delete('/delete/:id')
  deleteTown(@Param('id') id: number) {
    return this.townService.deleteTown(id).then((data) => {
      if (data.affected == 0) {
        return { success: false, message: 'Turar-joy topilmadi! ' };
      }
      return { success: true, message: "Turar-joy o'chirildi!" };
    });
  }

  @ApiOperation({
    summary: 'Turar-joylardagi bino va kvartiralar sonini korish',
  })
  @Get('/get-count')
  getCountOfBuildingsAndApartmentsInTown() {
    return this.townService
      .getCountOfBuildingsAndApartmentsInTown()
      .then((data) => {
        if (data.length != 0) {
          return { success: true, message: "Turar-joy ma'lumotlari", data };
        } else {
          return { success: false, message: "Turar-joy ma'lumotlari yoq" };
        }
      });
  }
  @ApiOperation({ summary: 'Home page infolar' })
  @Get('/homepage')
  homePageInfos() {
    return this.townService.homePageDatas();
  }

  @ApiOperation({
    summary: `EHTIYOT BO'LAMIZ ⛔⛔⛔ BU REQUEST BAZANI TOZALAB YUBORADI `,
  })
  @Delete('/clear-database')
  truncateDatabase() {
    return this.townService.clearDatabase().then((data) => {
      if (data) {
        return { success: true, message: 'Database tozalandi ✅' };
      } else {
        return { success: false, message: 'Database tozalashda xatolik ❌' };
      }
    });
  }
}
