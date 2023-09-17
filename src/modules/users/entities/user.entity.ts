import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import Model from '../../model/model.module';
import { Roles } from '../../roles/entities/role.entity';
import * as bcrypt from 'bcryptjs';
import { Sales } from '../../sales/entities/sale.entity';
import { Orders } from '../../orders/entities/order.entity';

@Entity('Users')
export class Users extends Model {
  @Column({nullable:true})
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column()
  is_active: boolean;

  @ManyToOne((type) => Roles, (roles) => roles.users)
  @JoinColumn({ name: 'role_id' })
  roles: Roles;

  @OneToMany((type) => Sales, (sales) => sales.users)
  sales: Sales[];

  @OneToMany((type) => Orders, (orders) => orders.users)
  orders: Orders[];

  @Column({
    default: 0,
  })
  tokenVersion: number;

  @BeforeInsert()
  async hashPassword() {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
