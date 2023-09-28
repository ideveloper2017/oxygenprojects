import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { Users } from '../../users/entities/user.entity';
import { Permissions } from '../../permissions/entities/permission.entity';
import Model from '../../model/model.module';
@Entity('Roles')
export class Roles extends Model {
  @Column()
  role_name: string;

  @Column()
  role_title: string;

  @Column()
  is_active: boolean;

  @OneToMany((type) => Users, (users) => users.roles)
  users: Users;

  @ManyToMany((type) => Permissions, (permission) => permission.roles)
  @JoinTable({ name: 'RoleHasPermission' })
  permission: Permissions[];
}
