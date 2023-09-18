import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CaisherService } from './caisher.service';
import { CreateCaisherDto } from './dto/create-caisher.dto';
import { UpdateCaisherDto } from './dto/update-caisher.dto';

@Controller('caisher')
export class CaisherController {
  constructor(private readonly caisherService: CaisherService) {}

  @Post()
  create(@Body() createCaisherDto: CreateCaisherDto) {
    return this.caisherService.create(createCaisherDto);
  }

  @Get()
  findAll() {
    return this.caisherService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.caisherService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCaisherDto: UpdateCaisherDto) {
    return this.caisherService.update(+id, updateCaisherDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.caisherService.remove(+id);
  }
}
