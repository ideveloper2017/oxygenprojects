import {BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne} from "typeorm";
import Model from "../../model/model.module";
import {Roles} from "../../roles/entities/role.entity";
import * as bcrypt from 'bcryptjs';

@Entity('Users')
export class Users extends Model {
    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column({nullable: true})
    phone_number: string;

    @Column()
    username: string;

    @Column()
    password: string;

    @Column()
    is_active: boolean;

    @ManyToOne(type => Roles, roles => roles.users)
    @JoinColumn({name: 'role_id'})
    roles: Roles[]

    // @OneToMany((type) => Sales, (sales) => sales.users)
    // sales: Sales[];
    //
    // @OneToMany((type) => Orders, (orders) => orders.users)
    // orders: Orders[];

    @BeforeInsert()
    async hashPassword() {
        this.password = await bcrypt.hash(this.password, 8);
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }
}