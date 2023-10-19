import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Floor } from './entities/floor.entity';
import { Buildings } from '../buildings/entities/building.entity';
import { Entrance } from '../entrance/entities/entrance.entity';

@Injectable()
export class FloorsService {
  constructor(
    @InjectRepository(Floor)
    private readonly floorRepository: Repository<Floor>,
  ) {}

  async addFloor(entrance_id: number) {
    // qavatlar tablitsasidagi entrancega tegishli qavatlarni oxirgisini chiqaradi
    const lastFloor = await this.floorRepository
      .createQueryBuilder('floor')
      .where('entrance_id = :entrance_id', { entrance_id })
      .orderBy('id', 'DESC')
      .getOne();

    // quyida yangi floor qo'shish kodi

    const newFloor = new Floor();
    newFloor.floor_number = lastFloor ? lastFloor.floor_number + 1 : 1;
    newFloor.entrance_id = entrance_id;

    const result = await this.floorRepository.save(newFloor);
    
    const building = await Entrance.findOne({where: {id: entrance_id}, relations: ['buildings']});

    await Buildings.createQueryBuilder()
      .update(Buildings)
      .set({ floor_number: () => 'floor_number + 1' })
      .where({ id: building.buildings.id })
      .execute();

    
    return result;
  }

  async getFloorOfEntrance(entrance_id: number) {
    const floors = await this.floorRepository.find({
      where: { entrance_id: entrance_id },
    });

    return floors;
  }

  async deleteFloor(id: number) {
    const del = await this.floorRepository.findOne({
      where: { id: id },
      relations: ['apartments'],
    });
    let res;
    if (del) {
      res = await this.floorRepository.delete(id);
    } else {
      res = { message: "o'chirib bo'lmaydi" };
    }
    return res;
  }
}
