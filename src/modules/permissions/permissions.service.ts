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

// {permission: [
//         {
//             dashboard: [
//                 {name: "dashboard.delete"},
//                 {name: "dashboard.update"},
//                 {name: "dashboard.view"},
//                 {name: "dashboard.create"},
//             ],
//         },
//         {
//             buildings: [
//                 {name: "buildings.delete"},
//                 {name: "buildings.view"},
//                 {name: "buildings.update"},
//                 {name: "buildings.create"},
//             ],
//         },
//         {
//             reports: [
//                 {name: "report.delete"},
//                 {name: "report.update"},
//                 {name: "report.view"},
//                 {name: "report.create"},
//             ],
//         },
//         {
//             sold: [
//                 {name: "sold.delete"},
//                 {name: "sold.update"},
//                 {name: "sold.view"},
//                 {name: "sold.create"},
//             ],
//         },
//         {
//             clients: [
//                 {name: "client.delete"},
//                 {name: "client.update"},
//                 {name: "client.view"},
//                 {name: "client.create"},
//             ],
//         },
//         {
//             users: [
//                 {name: "user.delete"},
//                 {name: "user.update"},
//                 {name: "user.view"},
//                 {name: "user.create"},
//             ],
//         },
//     ],
// };

  public filldata = async () => {
    if (this.permissionRepo.exist()) {
      return await this.permissionRepo
        .save([
          { id: 1, name: 'user.create' },
          { id: 2, name: 'user.view' },
          { id: 3, name: 'user.update' },
          { id: 4, name: 'user.save' },
          { id: 5, name: 'user.edit' },
          { id: 6, name: 'user.delete' },
          { id: 7, name: 'role.create' },
          { id: 8, name: 'role.save' },
          { id: 9, name: 'role.view' },
          { id: 10, name: 'role.update' },
          { id: 11, name: 'role.edit' },
          { id: 12, name: 'role.delete' },
          { id: 13, name: 'permission.create' },
          { id: 14, name: 'permission.save' },
          { id: 15, name: 'permission.update' },
          { id: 16, name: 'permission.view' },
          { id: 17, name: 'permission.edit' },
          { id: 18, name: 'permission.delete' },
          { id: 19, name: 'region.create' },
          { id: 20, name: 'region.save' },
          { id: 21, name: 'region.view' },
          { id: 22, name: 'region.update' },
          { id: 23, name: 'region.edit' },
          { id: 24, name: 'region.delete' },
          { id: 25, name: 'district.create' },
          { id: 26, name: 'district.save' },
          { id: 27, name: 'district.view' },
          { id: 28, name: 'district.update' },
          { id: 29, name: 'district.edit' },
          { id: 30, name: 'district.delete' },
          { id: 31, name: 'clients.create' },
          { id: 32, name: 'clients.save' },
          { id: 33, name: 'clients.view' },
          { id: 34, name: 'clients.update' },
          { id: 35, name: 'clients.edit' },
          { id: 36, name: 'clients.delete' },
          { id: 37, name: 'sold.create' },
          { id: 38, name: 'sold.save' },
          { id: 39, name: 'sold.update' },
          { id: 40, name: 'sold.delete' },
          { id: 41, name: 'report.create' },
          { id: 42, name: 'report.save' },
          { id: 43, name: 'report.update' },
          { id: 44, name: 'report.delete' },
          { id: 47, name: 'report.view' },
          { id: 48, name: 'buildings.view' },
          { id: 49, name: 'buildings.save' },
          { id: 50, name: 'buildings.create' },
          { id: 51, name: 'buildings.delete' },
          { id: 52, name: 'buildings.update' },
          { id: 42, name: 'dashboard.create' },
          { id: 53, name: 'dashboard.view' },
          { id: 54, name: 'dashboard.update' },
          { id: 55, name: 'dashboard.delete' },
          { id: 56, name: 'dashboard.save' },
        ])
        .then((data) => {});
    }
  };
}
