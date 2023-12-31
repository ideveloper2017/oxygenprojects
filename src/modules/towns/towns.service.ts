import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import { Towns } from './entities/town.entity';
import { RegionsService } from '../region/region.service';
import { DistrictsService } from '../district/district.service';
import { RolesService } from '../roles/roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateTownDto } from './dto/create-town.dto';
import { UpdateTownDto } from './dto/update-town.dto';
import { Users } from '../users/entities/user.entity';
import { Roles } from '../roles/entities/role.entity';
import { Payments } from '../payments/entities/payment.entity';
import { Apartments } from '../apartments/entities/apartment.entity';
import { Buildings } from '../buildings/entities/building.entity';
import { Orders } from '../orders/entities/order.entity';
import { Clients } from '../clients/entities/client.entity';
import { ApartmentStatus } from 'src/common/enums/apartment-status';
import { UsersService } from '../users/users.service';
import { PaymentMethodsService } from '../payment-method/payment-method.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { Regions } from '../region/entities/region.entity';
import { District } from '../district/entities/district.entity';

@Injectable()
export class TownService {
  constructor(
    @InjectRepository(Towns)
    private readonly townRepository: Repository<Towns>,
    private readonly regionService: RegionsService,
    private readonly districtService: DistrictsService,
    private readonly roleService: RolesService,
    private readonly permissionService: PermissionsService,
    private readonly userserv: UsersService,
    private readonly paymentMethodServ: PaymentMethodsService,
    private readonly currencyServ: CurrenciesService,
  ) {}

  async createTown(createTownDto: CreateTownDto) {
    const town = await this.townRepository.findOne({
      where: { name: createTownDto.name },
    });

    if (!town) {
      const newTown = await this.townRepository.save(createTownDto);
      return {
        status: 201,
        data: newTown,
        message: 'Town created successfully',
      };
    } else {
      return { status: 400, message: 'Bu nomdagi turar-joy mavjud' };
    }
  }

  async findAllTowns(user_id: any, id: number) {
    let towns;
    

    if (id != 0) {
      towns = await this.townRepository
        .createQueryBuilder('town')
        .leftJoinAndSelect(Regions, 'region', 'region.id=town.region_id')
        .leftJoinAndSelect(District, 'district', 'district.id=town.district_id')
        .leftJoinAndSelect(Buildings, 'buildings', 'buildings.town_id=town.id')
        .leftJoinAndSelect(Users, 'users', 'users.id=town.users_id')
        .where('town.id=:id', { id: id })
        //  .andWhere('town.users_id=:user_id',{user_id:user_id.id})
        .getMany();
    } else {
      towns = await this.townRepository
        .createQueryBuilder('town')
        .leftJoinAndSelect(Regions, 'region', 'region.id=town.region_id')
        .leftJoinAndSelect(District, 'district', 'district.id=town.district_id')
        .leftJoinAndSelect(Buildings, 'buildings', 'buildings.town_id=town.id')
        .leftJoinAndSelect(Users, 'users', 'users.id=town.users_id')
        //.andWhere('town.users_id=:user_id',{user_id:user_id.id})
        .getMany();
    }

    return towns;
  }

  async updateTown(id: number, updateTownDto: UpdateTownDto) {
    const updatedTown = await this.townRepository.update(id, updateTownDto);
    return updatedTown;
  }

  async deleteTown(id: number) {
    return await this.townRepository.delete(id);
  }

  async getCountOfBuildingsAndApartmentsInTown(user:any) {
    let result
    const users=await Users.findOne({where:{id:user.userId},relations:['roles']});
    const temp_array=users.town_access?.split(',');
    const town_access:number[]=temp_array?.map((str)=>Number(str))

   if  (users.roles.role_name=='SuperAdmin'){
     result = this.townRepository
         .createQueryBuilder()
         .select('town.id, town.name, town.created_at')
         .addSelect('COUNT(DISTINCT buildings.id)', 'buildingCount')
         .addSelect('COUNT(DISTINCT apartments.id)', 'apartmentCount')
         .from(Towns, 'town')
         .leftJoin('town.buildings', 'buildings')
         .leftJoin('buildings.entrances', 'entrances')
         .leftJoin('entrances.floors', 'floors')
         .leftJoin('floors.apartments', 'apartments')
         .groupBy('town.id').getRawMany();
   }

   if  (users.roles.role_name=='manager'){
     result = this.townRepository
         .createQueryBuilder()
         .select('town.id, town.name, town.created_at')
         .addSelect('COUNT(DISTINCT buildings.id)', 'buildingCount')
         .addSelect('COUNT(DISTINCT apartments.id)', 'apartmentCount')
         .from(Towns, 'town')
         .leftJoin('town.buildings', 'buildings')
         .leftJoin('buildings.entrances', 'entrances')
         .leftJoin('entrances.floors', 'floors')
         .leftJoin('floors.apartments', 'apartments')
         .where("town.id In(:...town_access)",{town_access})
         .groupBy('town.id').getRawMany();
   }

   if (users.roles.role_name=='Seller'){
     result = this.townRepository
         .createQueryBuilder()
         .select('town.id, town.name, town.created_at')
         .addSelect('COUNT(DISTINCT buildings.id)', 'buildingCount')
         .addSelect('COUNT(DISTINCT apartments.id)', 'apartmentCount')
         .from(Towns, 'town')
         .leftJoin('town.buildings', 'buildings')
         .leftJoin('buildings.entrances', 'entrances')
         .leftJoin('entrances.floors', 'floors')
         .leftJoin('floors.apartments', 'apartments')
         .where("town.id In(:...town_access)",{town_access})
         .groupBy('town.id').getRawMany();
   }
   return result;
  }
  async homePageDatas() {
    const towns = await this.townRepository.count();
    const buildings = await this.townRepository.manager
      .getRepository(Buildings)
      .count();
    const orders = await this.townRepository.manager
      .getRepository(Orders)
      .count();
    const clients = await this.townRepository.manager
      .getRepository(Clients)
      .count();
    const payments = await this.townRepository.manager
      .getRepository(Payments)
      .count();
    const roles = await this.townRepository.manager
      .getRepository(Roles)
      .count();
    const users = await this.townRepository.manager
      .getRepository(Users)
      .count();
    const apartments = await this.townRepository.manager
      .getRepository(Apartments)
      .count();
    const bookedApartments = await this.townRepository.manager
      .getRepository(Apartments)
      .count({ where: { status: ApartmentStatus.BRON } });

    return {
      towns,
      buildings,
      apartments,
      orders,
      users,
      roles,
      clients,
      payments,
      bookedApartments,
    };
  }

  async clearDatabase() {
    const connection = this.townRepository.manager.connection;
    const queryRunner = connection.createQueryRunner();

    const table_names = connection.entityMetadatas.map(
      (entity) => entity.tableName,
    );
    const check = [];

    for await (const table_name of table_names) {
      // ============================== 2 usul ============================
      const res = await queryRunner.query(
        `TRUNCATE TABLE "${table_name}" RESTART IDENTITY CASCADE`,
      );
      check.push(res);
    }
    await this.regionService.fillDataRegion();
    await this.districtService.fillDataDistrict();
    await this.roleService.filldata();
    await this.permissionService.filldata();
    await this.userserv.createdefaultUser();
    await this.currencyServ.createDefault();
    await this.paymentMethodServ.createDefault();

    return table_names.length == check.length
  }
}
