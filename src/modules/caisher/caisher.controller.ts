import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException, Query
} from "@nestjs/common";
import { CaisherService } from './caisher.service';
import { CreateCaisherDto } from './dto/create-caisher.dto';
import { UpdateCaisherDto } from './dto/update-caisher.dto';
import {ApiProperty, ApiQuery, ApiTags} from "@nestjs/swagger";
import { UserRole } from "../roles/entities/role.entity";
import { Caisher } from "./entities/caisher.entity";
import { Paymentmethods } from "../../common/enums/paymentmethod";

@ApiTags('Caisher')
@Controller('caisher')
export class CaisherController {
  constructor(private readonly caisherService: CaisherService) {}

  @Post()
  create(@Body() createCaisherDto: CreateCaisherDto) {
    return this.caisherService
      .create(createCaisherDto)
      .then((data) => {
        if (data.hasId()) {
          return { success: true, message: 'created' };
        } else {
          return { success: false, message: 'not created' };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }

  @Get()
  findAll() {
    return this.caisherService
      .findAll()
      .then((data) => {
        if (data.length != 0) {
          return { success: true, data: data, message: 'fetch all record!!!' };
        } else {
          return {
            success: true,
            data: [],
            message: 'not fetch all record!!!',
          };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.caisherService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCaisherDto: UpdateCaisherDto) {
    try {


      return this.caisherService.update(+id,  updateCaisherDto).then((data) => {
        if (data.affected != 0) {
          return { success: true, data: data, message: 'update product' };
        } else {
          return { success: false, data: data, message: 'not update product' };
        }
      });
    } catch (error) {
      throw new BadRequestException(`Failed to update product`);
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    try {
      return this.caisherService.remove(+id).then((data) => {
        if (data.affected) {
          return { success: true, message: 'deleted' };
        } else {
          return { success: false, message: 'not deleted' };
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
