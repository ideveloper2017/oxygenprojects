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
import { CreateApartmentPriceDto } from './dto/create-apartment-price';

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
    const build_id = res.entrance.buildings.id;
    const maxRoomNumber = await Towns.createQueryBuilder('town')
      .innerJoin('town.buildings', 'building')
      .innerJoin('building.entrances', 'entrance')
      .innerJoin('entrance.floors', 'floor')
      .innerJoin('floor.apartments', 'apartment')
      .where('building.town_id = :town_id', { town_id })
      .andWhere('entrance.building_id= :build_id', { build_id: build_id })
      // .andWhere('apartment.room_number= :room_number', {
      //   room_number: createApartmentDto.room_number,
      // })
      .andWhere('floor.floor_number= :floor_number', {
        floor_number: createApartmentDto.floor_number,
      })
      .andWhere('entrance.entrance_number= :entrance_number', {
        entrance_number: createApartmentDto.entrance_number,
      })
      .select('apartment.room_number AS maxRoomNumber')
      .orderBy('apartment.room_number', 'DESC')
      .getRawOne();

    const findapartment = await Apartments.findOne({
      relations: ['floor.entrance'],
      where: {
        floor: {
          floor_number: createApartmentDto.floor_number,
          entrance: { entrance_number: createApartmentDto.entrance_number },
        },
        room_number: createApartmentDto.room_number,
      },
    });

    if (findapartment === null) {
      const newApartment = new Apartments();
      newApartment.floor_id = floor_id;
      newApartment.room_number = createApartmentDto.room_number
        ? createApartmentDto.room_number
        : maxRoomNumber !== undefined
        ? maxRoomNumber.maxroomnumber + 1
        : 1;
      newApartment.cells = createApartmentDto.cells;
      newApartment.room_space = createApartmentDto.room_space;
      newApartment.mk_price = await Buildings.findOne({
        where: { id: build_id },
      }).then((data) => data.mk_price);
      newApartment.status = createApartmentDto.status;
      newApartment.positions = createApartmentDto.positions;
      const result = await this.apartmentRepository.save(newApartment);
      return { success: true, data: result, message: 'Xona qo`shildi' };
    } else {
      return {
        success: false,
        message:
          'Ushbu ' +
          findapartment?.floor?.entrance?.entrance_number +
          '-podyezd ' +
          findapartment?.floor?.floor_number +
          '-etajda ' +
          findapartment?.room_number +
          '-xona mavjud !!!',
      };
    }
  }

  async updateApartment(id: number, updateApartmentDto: UpdateApartmentDto) {
    const findapartment = await Apartments.findOne({
      relations: ['floor.entrance'],
      where: {
        room_number: updateApartmentDto.room_number,
        floor: {
          floor_number: updateApartmentDto.floor_number,
          entrance: { entrance_number: updateApartmentDto.entrance_number },
        },
      },
    });

    console.log(findapartment);
    if (findapartment === null) {
      const editedApartment = await this.apartmentRepository.update(
        { id: id },
        {
          room_number: +updateApartmentDto.room_number,
          cells: updateApartmentDto.cells,
          room_space: updateApartmentDto.room_space,
          status: updateApartmentDto.status,
          positions: updateApartmentDto.positions,
        },
      );
      return {
        success: true,
        data: editedApartment,
        message: 'Xona  raqami o`zgartirildi',
      };
    } else {
      return {
        success: false,
        message:
          'Ushbu ' +
          findapartment?.floor?.entrance?.entrance_number +
          '-podyezd ' +
          findapartment?.floor?.floor_number +
          '-etajda ' +
          findapartment?.room_number +
          '-xona mavjud !!!',
      };
    }
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
    if (
      check.status != ApartmentStatus.SOLD &&
      check.status != ApartmentStatus.INACTIVE
    ) {
      const booking = await this.apartmentRepository.update(
        { id: id },
        { status: ApartmentStatus.BRON },
      );

      return booking;
    } else {
      return null;
    }
  }

  async findAllApartments() {
    const apartments = await this.apartmentRepository.find({
      where: { status: ApartmentStatus.FREE },
      relations: ['floor.entrance.buildings.towns'],
      order: {
        floor: {
          floor_number: 'DESC',
          entrance: { buildings: { towns: { name: 'ASC' }, name: 'ASC' } },
        },
      },
    });
    return apartments;
  }

  async findBookedApartments(offset: number, limit: number) {
    const bookeds = await this.apartmentRepository.find({
      where: { status: ApartmentStatus.BRON },
      skip: offset,
      take: limit,
      order: { updated_at: 'DESC' },
    });
    return bookeds;
  }

  async getApartmentPrices() {
    return await this.apartmentRepository.manager
      .createQueryBuilder(Apartments, 'apartments')
      .leftJoinAndSelect(
        'apartments.floor',
        'floor',
        'apartments.floor_id=floor.id',
      )
      .leftJoinAndSelect(
        'floor.entrance',
        'entrance',
        'floor.entrance_id=entrance.id',
      )
      .leftJoinAndSelect(
        'entrance.buildings',
        'buildings',
        'entrance.building_id=buildings.id',
      )
      .leftJoinAndSelect(
        'buildings.towns',
        'towns',
        'towns.id=buildings.town_id',
      )

      .select('towns.name as townname')
      .addSelect('buildings.name as buildingname')
      .addSelect('floor.floor_number as floor_number')
      .addSelect('apartments.*')
      .orderBy('buildings.name', 'ASC')
      .addOrderBy('floor.floor_number', 'DESC')
      .getRawMany();
  }

  async createApartmentPrice(createapartmentpricedto: CreateApartmentPriceDto) {
    {
      let ret;
      for (
        let aprt_id = 0;
        aprt_id < createapartmentpricedto.apartment_id.length;
        aprt_id++
      ) {
        ret = await Apartments.update(
          { id: createapartmentpricedto.apartment_id[aprt_id] },
          { mk_price: createapartmentpricedto.mk_price },
        );
      }
      return ret;
    }
  }
}
