import { Injectable } from '@nestjs/common';
import { CreateCaisherDto } from './dto/create-caisher.dto';
import { UpdateCaisherDto } from './dto/update-caisher.dto';
import { Repository } from 'typeorm';
import { Caisher } from './entities/caisher.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {Towns} from "../towns/entities/town.entity";

@Injectable()
export class CaisherService {
  constructor(
    @InjectRepository(Caisher)
    private readonly caisherServ: Repository<Caisher>,
  ) {}
  async create(createCaisherDto: CreateCaisherDto) {
    const town=await Towns.findOne({where:{id:createCaisherDto.town_id}});
    const caisher = await this.caisherServ.create(createCaisherDto);
    return this.caisherServ.save([{
      caisher_name: createCaisherDto.caisher_name,
      is_active: createCaisherDto.is_active,
      is_default: createCaisherDto.is_default,
      towns:town
    }]);
  }

  findAll(): Promise<Caisher[]> {
    return this.caisherServ.find({relations:['towns']});
  }

  findOne(id: number) {
    return this.caisherServ.findOne({ where: { id: id } });
  }

  async update(id: number, updateCaisherDto: UpdateCaisherDto) {

    const town=await Towns.findOne({where:{id:updateCaisherDto.town_id}});
    return this.caisherServ.update({ id: id }, {
      caisher_name: updateCaisherDto.caisher_name,
      is_active: updateCaisherDto.is_active,
      towns:town
    });
  }

  remove(id: number) {
    return this.caisherServ.delete({ id: id });
  }
}
