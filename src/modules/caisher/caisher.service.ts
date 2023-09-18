import { Injectable } from '@nestjs/common';
import { CreateCaisherDto } from './dto/create-caisher.dto';
import { UpdateCaisherDto } from './dto/update-caisher.dto';

@Injectable()
export class CaisherService {
  create(createCaisherDto: CreateCaisherDto) {
    return 'This action adds a new caisher';
  }

  findAll() {
    return `This action returns all caisher`;
  }

  findOne(id: number) {
    return `This action returns a #${id} caisher`;
  }

  update(id: number, updateCaisherDto: UpdateCaisherDto) {
    return `This action updates a #${id} caisher`;
  }

  remove(id: number) {
    return `This action removes a #${id} caisher`;
  }
}
