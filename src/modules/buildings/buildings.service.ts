import { Injectable } from '@nestjs/common';
import { Buildings } from './entities/building.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBuildingDto } from './dto/create-building.dto';
import { Entrance } from '../entrance/entities/entrance.entity';
import { Floor } from '../floor/entities/floor.entity';
import { Apartments } from '../apartments/entities/apartment.entity';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { ApartmentStatus } from 'src/common/enums/apartment-status';
import { BuildingItems } from './entities/buildingitems.entity';
import { ExchangRates } from '../exchang-rates/entities/exchang-rate.entity';
import { CreateBuildingitemsDto } from './dto/create-buildingitems.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Buildings)
    private readonly buildingRepository: Repository<Buildings>,
    @InjectRepository(BuildingItems)
    private readonly buildingItemsRepository: Repository<BuildingItems>,
  ) {}

  async createBuilding(createBuildingDto: CreateBuildingDto) {
    try {
      let building = new Buildings();
      const usdRate = await ExchangRates.findOne({
        where: { is_default: true },
      });

      building.name = createBuildingDto.name;
      building.town_id = createBuildingDto.town_id;
      building.entrance_number = createBuildingDto.entrance_number;
      building.floor_number = createBuildingDto.floor_number;
      building.apartment_number = createBuildingDto.apartment_number;
      building.mk_price = createBuildingDto.mk_price;

      building = await this.buildingRepository.save(building);

      let buildingItems = new BuildingItems();
      buildingItems.building_id = building.id;
      buildingItems.createBuildingDate = new Date();
      buildingItems.mk_price = createBuildingDto.mk_price;
      buildingItems.mk_price_usd = Math.round(
        Number(createBuildingDto.mk_price) / Number(usdRate.rate_value),
      );
      buildingItems.is_active = true;
      buildingItems = await this.buildingItemsRepository.save(buildingItems);

      let kv = 1;
      const records = [];
      for (let blok = 1; blok <= building.entrance_number; blok++) {
        const entrance = new Entrance();
        entrance.buildings = building;
        entrance.entrance_number = blok;
        await this.buildingRepository.manager
          .getRepository(Entrance)
          .save(entrance);

        for (let layer = 1; layer <= building.floor_number; layer++) {
          const floor = new Floor();
          floor.floor_number = layer;
          floor.entrance = entrance;
          await this.buildingRepository.manager
            .getRepository(Floor)
            .save(floor);

          for (
            let apartment = 1;
            apartment <= building.apartment_number;
            apartment++
          ) {
            const apartment = new Apartments();
            apartment.floor = floor;
            apartment.room_number = kv++;
            apartment.cells = 1;
            apartment.status = ApartmentStatus.FREE;
            apartment.room_space = 58.5;
            apartment.mk_price = createBuildingDto.mk_price;
            records.push(apartment);
          }
        }
      }
      const result = await this.buildingRepository.manager
        .getRepository(Apartments)
        .save(records);
      return result;
    } catch (error) {
      return { message: 'Error creating building', error: error.message };
    }
  }
  async findAllBuildings(id: number) {
    let result;
    if (id == 0) {
      result = await this.buildingRepository.find({
        relations: ['entrances.floors.apartments', 'buildingItems', 'file'],
        order: {
          entrances: {
            entrance_number: 'asc',
            floors: { floor_number: 'asc', apartments: { room_number: 'asc' } },
          },
        },
      });
    } else {
      result = await this.buildingRepository.findOne({
        where: { id: id },
        relations: ['entrances.floors.apartments', 'buildingItems', 'file'],
        order: {
          entrances: {
            entrance_number: 'asc',
            floors: { floor_number: 'asc', apartments: { room_number: 'asc' } },
          },
        },
      });
    }
    return result;
  }

  public async getBuilding(id: number) {
    return await this.buildingRepository.find({
      where: { id: id },
      order: { apartment_number: 'ASC' },
    });
  }

  async updateBuilding(id: number, updateBuildingDto: UpdateBuildingDto) {
    const building = await this.buildingRepository.update(
      { id: id },
      updateBuildingDto,
    );

    return building;
  }

  async deleteBuilding(id: number) {
    const result = await this.buildingRepository.delete(id);
    return result;
  }

  async getBuldingsOfTown(town_id: number) {
    const result = await this.buildingRepository.find({
      relations: ['buildingItems'],
      where: { town_id: town_id, buildingItems: { is_active: true } },
      order: { id: 'desc' },
    });
    // const result = await this.buildingRepository.manager
    //   .createQueryBuilder(Buildings, 'buildingItems')
    //   .leftJoinAndSelect(
    //     'buildings.buildingItems',
    //     'buildingItems',
    //     'buildingItems.building_id=buildingItems.id',
    //   )
    //   .where('buildings.town_id= :town_id',{town_id})
    //   // .andWhere('buildingItems.is_active= :is_active', { is_active: true })
    //   .getRawMany();
    console.log(result);
    return result;
  }
  async changeBuildingPrice(createbuildingitems: CreateBuildingitemsDto) {
    const usdRate = await ExchangRates.findOne({
      where: { is_default: true },
    });

    BuildingItems.update(
      { building_id: createbuildingitems.building_id, is_active: true },
      { is_active: false },
    );
    let buildingItems = new BuildingItems();
    buildingItems.building_id = createbuildingitems.building_id;
    buildingItems.createBuildingDate = new Date();
    // createbuildingitems.createBuildingDate;
    buildingItems.mk_price = createbuildingitems.mk_price;
    buildingItems.mk_price_usd = Math.round(
      Number(createbuildingitems.mk_price) / Number(usdRate.rate_value),
    );
    buildingItems.is_active = true;
    buildingItems.note_action=createbuildingitems.note_action;
    buildingItems = await this.buildingItemsRepository.save(buildingItems);

    const building = await this.buildingRepository.manager
      .createQueryBuilder(Entrance, 'entrance')
      .leftJoinAndSelect(
        'entrance.buildings',
        'buildings',
        'buildings.id=entrance.building_id',
      )
      .leftJoinAndSelect(
        'entrance.floors',
        'floor',
        'floor.entrance_id=entrance.id',
      )
      .leftJoinAndSelect(
        'floor.apartments',
        'apartments',
        'apartments.floor_id=floor.id',
      )

      .select(['buildings.id as building_id', 'apartments.id as apartment_id'])
      .where('buildings.id= :building_id', {
        building_id: createbuildingitems.building_id,
      })
      .getRawMany();

    building.forEach(async (data) => {
      await Apartments.update(
        { id: data.apartment_id, status: ApartmentStatus.FREE },
        { mk_price: createbuildingitems.mk_price },
      );
    });
    return buildingItems;
  }

  async allBuildingsPrice() {
    return await this.buildingItemsRepository.manager
      .createQueryBuilder(BuildingItems, 'buildingItems')
      .leftJoinAndSelect(
        'buildingItems.building',
        'buildings',
        'buildingItems.building_id=buildings.id',
      )
      .leftJoinAndSelect(
        'buildings.towns',
        'towns',
        'towns.id=buildings.town_id',
      )

      // .leftJoinAndSelect('buildings.entrances','entrances','entrances.building_id=buildings.id')
      // .leftJoinAndSelect('entrances.floors','floor','floor.entrance_id=entrances.id')
      // .leftJoinAndSelect('floor.apartments','apartments','apartments.floor_id=floor.id')
      .select('towns.name as townname')
      .addSelect('buildings.name as buildingname')
      .addSelect('buildingItems.mk_price as mk_price')
      .addSelect('buildingItems.mk_price_usd as mk_price_usd')
      .addSelect('buildingItems.createBuildingDate as createBuildingDate')
      .addSelect('buildingItems.note_action as note_action')
      .addSelect('buildingItems.is_active as is_active')
      .orderBy('buildingItems.id', 'DESC')
      .addOrderBy('buildings.name', 'ASC')
      .getRawMany();
  }
}
