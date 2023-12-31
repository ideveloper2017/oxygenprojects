import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TownService } from './towns.service';
import { CreateTownDto } from './dto/create-town.dto';
import { UpdateTownDto } from './dto/update-town.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Users } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "mavjud turar-joylarni ro'yxatini olish" })
  @Get('/all-one/:id')
  getAllTowns(@AuthUser() user_id: any, @Param('id') id: number) {
    return this.townService
      .findAllTowns(user_id, id)
      .then((data) => {
        if (data || data.length > 0) {
          return {
            success: true,
            data,
            message: 'Fetched data',
          };
        } else if (data === false) {
          return { success: false, message: 'No data found' };
        } else {
          return { success: false, message: 'No data found' };
        }
      })
      .catch((error) => {
        return { status: error.code, message: error.message };
      });
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
    return this.townService
      .deleteTown(id)
      .then((data) => {
        if (data.affected) {
          return { success: false, message: 'Turar-joy topilmadi! ' };
        }
        return { success: true, message: "Turar-joy o'chirildi!" };
      })
      .catch((error) => {
        return { status: error.code, message: error.message };
      });
  }

  @ApiOperation({
    summary: 'Turar-joylardagi bino va kvartiralar sonini korish',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/get-count')
  getCountOfBuildingsAndApartmentsInTown(@AuthUser() user:any) {
    return this.townService
      .getCountOfBuildingsAndApartmentsInTown(user)
      .then((data) => {
        if (data.length != 0) {
          return { success: true, message: "Turar-joy ma'lumotlari", data };
        } else {
          return { success: false, message: "Turar-joy ma'lumotlari yoq" };
        }
      }).catch((error)=>{
          return { status: error.code, message: error.message };
        });
  }
  @ApiOperation({ summary: 'Home page infolar' })
  @Get('/homepage')
  homePageInfos() {
    return this.townService.homePageDatas();
  }

  // @ApiOperation({
  //   summary: `EHTIYOT BO'LAMIZ ⛔⛔⛔ BU REQUEST BAZANI TOZALAB YUBORADI `,
  // })
  // @Delete('/clear-database')
  // truncateDatabase() {
  //   return this.townService.clearDatabase().then((data) => {
  //     if (data) {
  //       return { success: true, message: 'Database tozalandi ✅' };
  //     } else {
  //       return { success: false, message: 'Database tozalashda xatolik ❌' };
  //     }
  //   });
  // }
}
