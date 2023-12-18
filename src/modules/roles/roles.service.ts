import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Roles } from './entities/role.entity';
import { Permissions } from '../permissions/entities/permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Roles)
    private roleRepo: Repository<Roles>,
  ) {}

  public async getRoleList() {
    return await this.roleRepo.find({ relations: ['permissions'] });
  }

  public filldata = async () => {
    const permissions = await this.roleRepo.manager
      .getRepository(Permissions)
      .find();

    // const permssionsAgent = await permissionRepo.findBy({
    //   name: In(['shop.view', 'region.view', 'district.view', 'address.view']),
    // });
    let roles: any;
    if (this.roleRepo.exist()) {
      roles = await this.roleRepo.save([
        {
          id: 1,
          role_name: 'SuperAdmin',
          role_title: 'Админ',
          is_active: true,
          permission: permissions,
        },
        {
          id: 2,
          role_name: 'manager',
          role_title: 'Менеджер',
          is_active: true,
          permission: permissions,
        },
        // {
        //   id: 3,
        //   role_name: 'Seller',
        //   role_title: 'Продавец',
        //   is_active: true,
        //   permission: permissions,
        // },
        // {
        //   id: 4,
        //   role_name: 'Operator',
        //   role_title: 'Опетарор',
        //   is_active: true,
        //   permission: permissions,
        // },
        // {
        //   id: 5,
        //   role_name: 'Caisher',
        //   role_title: 'Кассир',
        //   is_active: true,
        //   permission: permissions,
        // },
        // {
        //   id: 6,
        //   role_name: 'Account',
        //   role_title: 'Бухгалтер',
        //   is_active: true,
        //   permission: permissions,
        // },
      ]);
    }
    return roles;
  };
}
