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
    return this.caisherServ.save(caisher);
  }

  findAll(): Promise<Caisher[]> {
    return this.caisherServ.find();
  }

  findOne(id: number) {
    return this.caisherServ.findOne({ where: { id: id } });
  }

  update(id: number, updateCaisherDto: UpdateCaisherDto) {
    return this.caisherServ.update({ id: id }, updateCaisherDto);
  }

  remove(id: number) {
    return this.caisherServ.delete({ id: id });
  }
}
