import { Injectable } from '@nestjs/common';
import { CreateCaisherDto } from './dto/create-caisher.dto';
import { UpdateCaisherDto } from './dto/update-caisher.dto';
import { Repository } from 'typeorm';
import { Caisher } from './entities/caisher.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CaisherService {
  constructor(
    @InjectRepository(Caisher)
    private readonly caisherServ: Repository<Caisher>,
  ) {}
  async create(createCaisherDto: CreateCaisherDto) {
    const caisher = await this.caisherServ.create(createCaisherDto);
    // return caisher;
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
