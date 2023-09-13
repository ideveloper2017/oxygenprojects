
import { Column, Entity, ManyToMany } from 'typeorm';
import {Roles} from "../../roles/entities/role.entity";
import Model from "../../model/model.module";

@Entity('Permissions')
export class Permissions extends Model {
    @Column()
    name: string;

    @ManyToMany((type) => Roles, (role) => role.permission)
    roles: Roles[];
}
