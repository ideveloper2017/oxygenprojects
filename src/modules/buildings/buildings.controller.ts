import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @ApiOperation({ summary: 'Bino yaratish ichidagi kvartiralari bilan' })
  @Post('/add')
  addBuilding(@Body() createBuildingDto: CreateBuildingDto) {
    return this.buildingsService
      .createBuilding(createBuildingDto)
      .then((response) => {
        if (!response) {
          return {
            status: 200,
            success: true,
            data: response,
            message: 'Building added successfully',
          };
        } else {
          return {
            status: 409,
            success: false,
            ...response,
          };
        }
      });
  }

  @ApiOperation({ summary: 'id=0 -barcha binolar || id=4 bitta bino' })
  @Get('/all/:id')
  getAllBuildings(@Param('id', ParseIntPipe) id: number) {
    return this.buildingsService
      .findAllBuildings(id)
      .then((data) => {
        if (data !== null && data.length != 0) {
          return { success: true, data, message: 'Data fetched successfully' };
        } else {
          return { success: false, message: 'No data found!' };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }

  @Get('/:town_id')
  getTestBuildings(@Param('town_id') town_id: number, @Res() res: Response) {
    return this.buildingsService
      .getBuldingsOfTown(town_id)
      .then((data) => {
        if (data.length > 0) {
          return res.status(200).send({
            success: true,
            data,
            message: 'found record!!!',
          });
        } else {
          res.status(200).send({
            success: false,
            data: null,
            message: 'not found record!!!',
          });
        }
      })
      .catch((error) => {
        res
          .status(200)
          .send({ success: false, data: null, message: 'not found record!!!' });
      });
  }

  @ApiOperation({ summary: 'Bino tahrirlash' })
  @Patch('/edit/:id')
  editBuilding(
    @Param('id') id: number,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ) {
    return this.buildingsService
      .updateBuilding(id, updateBuildingDto)
      .then((data) => {
        if (data.affected) {
          return { success: true, message: 'Bino tahrirlandi.' };
        } else {
          return { success: false, message: 'Bino topilmadi.' };
        }
      })
      .catch((error) => console.log(error));
  }

  @ApiOperation({ summary: "Bino o'chirish" })
  @Delete('/delete/:id')
  deleteBuilding(@Param('id') id: number) {
    return this.buildingsService
      .deleteBuilding(id)
      .then((data) => {
        if (data.affected != 0) {
          return { success: true, message: "Bino o'chirildi" };
        }
        return { success: false, message: 'Bino topilmadi' };
      })
      .catch((error) => console.log(error));
  }

  @ApiOperation({ summary: "Bino narxini o'zgartirish" })
  @Post('/new/buildprice/:id')
  newBuildPrice(@Param('id', ParseIntPipe) id: number) {
    // return this.buildingsService.
  }

  @Get('/buldingprice/all')
  buildingprice(@Res() res: Response) {
    return this.buildingsService
      .allBuildingsPrice()
      .then((data) => {
        if (data) {
          return res.status(200).send({
            success: true,
            data,
            message: 'found record!!!',
          });
        } else {
          res.status(200).send({
            success: false,
            data: null,
            message: 'not found record!!!',
          });
        }
      })
      .catch((error) => console.log(error));
  }

  // @Post('/image/:id')
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary',
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('file'))
  // async addImageForBuilding(@Param('id') id:number, @UploadedFile() file: Express.Multer.File) {
  //   return this.buildingsService.addImage(id, file.buffer, file.originalname);
  // }
}
