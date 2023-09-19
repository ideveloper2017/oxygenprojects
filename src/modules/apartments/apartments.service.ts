import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Apartments } from './entities/apartment.entity';
import { Repository } from 'typeorm';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

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
    const newApartment = new Apartments();
    newApartment.floor_id = floor_id;
    newApartment.room_number = createApartmentDto.room_number;
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
      relations: ['floor.entrance.buildings.towns'],
    });

    // const apartment  = await this.apartmentRepository.createQueryBuilder('apartments')
    // .leftJoinAndSelect('apartments.floor', 'floor') // Join the customer table
    // .leftJoinAndSelect('floor.entrance', 'entrance') // Join the items table
    // .leftJoinAndSelect('entrance.buildings', 'buildings') // Join the items table
    // .leftJoinAndSelect('buildings.towns', 'towns') // Join the items table
    // .select([  'towns.name','buildings.name','entrance.entrance_number', 'floor.floor_number', 'apartments.room_number','apartments.cells','apartments.room_space', 'buildings.mk_price', 'towns.address']) // Select columns from both order, customer, and item tables
    // .where('apartments.id = :id', {id})
    // .getOne();

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
    const booking = await this.apartmentRepository.update(
      { id: id },
      { status: 'bron' },
    );
    return booking;
  }

  async findAllApartments(){
    const apartments = await this.apartmentRepository.find()
    return apartments
  }
}
