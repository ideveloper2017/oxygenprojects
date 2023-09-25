import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Apartments } from './entities/apartment.entity';
import { Repository } from 'typeorm';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { Floor } from '../floor/entities/floor.entity';
import { Buildings } from '../buildings/entities/building.entity';
import { Towns } from '../towns/entities/town.entity';
import { ApartmentStatus } from 'src/common/enums/apartment-status';

@Injectable()
export class ApartmentsService {
  constructor(
    @InjectRepository(Apartments)
    private readonly apartmentRepository: Repository<Apartments>,
  ) {}

  async addOneApartment(
    floor_id: number,
    createApartmentDto: CreateApartmentDto,
  ) {
    const res = await Floor.findOne({
      where: { id: floor_id },
      relations: ['entrance.buildings.towns'],
    });
    const town_id = res.entrance.buildings.towns.id;
    const { maxRoomNumber } = await Towns.createQueryBuilder('town')
      .innerJoin('town.buildings', 'building')
      .innerJoin('building.entrances', 'entrance')
      .innerJoin('entrance.floors', 'floor')
      .innerJoin('floor.apartments', 'apartment')
      .where('building.town_id = :town_id', { town_id })
      .select('MAX(apartment.room_number)', 'maxRoomNumber')
      .getRawOne();

    const newApartment = new Apartments();
    newApartment.floor_id = floor_id;
    newApartment.room_number = maxRoomNumber ? maxRoomNumber + 1 : 1;
    newApartment.cells = createApartmentDto.cells;
    newApartment.room_space = createApartmentDto.room_space;
    newApartment.status = createApartmentDto.status;

    return await this.apartmentRepository.save(newApartment);
  }

  async updateApartment(id: number, updateApartmentDto: UpdateApartmentDto) {
    const editedApartment = await this.apartmentRepository.update(
      { id: id },
      updateApartmentDto,
    );
    return editedApartment;
  }

  async getOneApartment(id: number) {
    const apartment = await this.apartmentRepository.findOne({
      where: { id: id },
      relations: ['floor.entrance.buildings.towns', 'file'],
    });

    return apartment;
  }

  async deleteApartment(id: number) {
    const deletedApartment = await this.apartmentRepository.delete(id);
    return deletedApartment;
  }

  async getApartments(floor_id: number) {
    const apartments = await this.apartmentRepository.find({
      where: { floor_id: floor_id },
    });
    return apartments;
  }

  async bookingApartment(id: number) {
    const check = await this.apartmentRepository.findOne({ where: { id: id } });
    if (check.status != ApartmentStatus.SOLD && check.status != ApartmentStatus.INACTIVE) {
      const booking = await this.apartmentRepository.update(
        { id: id },
        { status: ApartmentStatus.BRON });

      return booking;
    } else {
      return null;
    }
  }

  async findAllApartments() {
    const apartments = await this.apartmentRepository.find();
    return apartments;
  }

  async findBookedApartments(offset: number, limit :number) {
    const bookeds = await this.apartmentRepository.find({
      where: { status: ApartmentStatus.BRON },
      skip: offset,
      take: limit,
      order: { updated_at: 'DESC' },
      
    });
    return bookeds;
  }

}
