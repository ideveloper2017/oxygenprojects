import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Permissions } from '../permissions/entities/permission.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permissions)
    private readonly permissionRepo: Repository<Permissions>,
  ) {}

  public getPermission = async () => {
    return await this.permissionRepo.find({ relations: ['roles'] });
  };

  public filldata = async () => {
    const perm= await this.permissionRepo.find();
    if (perm.length==0) {
      return await this.permissionRepo
        .save([
          { id: 1, name: 'user.create' },
          { id: 2, name: 'user.view' },
          { id: 3, name: 'user.update' },
          { id: 4, name: 'user.delete' },
          { id: 5, name: 'role.create' },
          { id: 6, name: 'role.view' },
          { id: 7, name: 'role.update' },
          { id: 8, name: 'role.delete' },
          { id: 9, name: 'permission.create' },
          { id: 10, name: 'permission.update' },
          { id: 11, name: 'permission.view' },
          { id: 12, name: 'permission.delete' },
          { id: 13, name: 'region.create' },
          { id: 14, name: 'region.view' },
          { id: 15, name: 'region.update' },
          { id: 16, name: 'region.delete' },
          { id: 17, name: 'district.create' },
          { id: 18, name: 'district.view' },
          { id: 19, name: 'district.update' },
          { id: 20, name: 'district.delete' },
          { id: 21, name: 'clients.create' },
          { id: 22, name: 'clients.view' },
          { id: 23, name: 'clients.update' },
          { id: 24, name: 'clients.delete' },
          { id: 25, name: 'sold.create' },
          { id: 26, name: 'sold.view' },
          { id: 27, name: 'sold.update' },
          { id: 28, name: 'sold.delete' },
          { id: 29, name: 'report.create' },
          { id: 30, name: 'report.update' },
          { id: 31, name: 'report.delete' },
          { id: 32, name: 'report.view' },
          { id: 33, name: 'buildings.view' },
          { id: 34, name: 'buildings.create' },
          { id: 35, name: 'buildings.delete' },
          { id: 36, name: 'buildings.update' },
          { id: 37, name: 'dashboard.create' },
          { id: 38, name: 'dashboard.view' },
          { id: 39, name: 'dashboard.update' },
          { id: 40, name: 'dashboard.delete' },
          { id: 41, name: 'dashboard.save' },
        ])
        .then((data) => {});
    }
  };
}
