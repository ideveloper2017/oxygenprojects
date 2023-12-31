import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import Model from '../../model/model.module';
import { Roles } from '../../roles/entities/role.entity';
import * as bcrypt from 'bcryptjs';
import { Orders } from '../../orders/entities/order.entity';
import { Payments } from '../../payments/entities/payment.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Exclude } from 'class-transformer';
import { Towns } from 'src/modules/towns/entities/town.entity';
import {Clients} from "../../clients/entities/client.entity";
import {ExchangRates} from "../../exchang-rates/entities/exchang-rate.entity";

@Entity('Users')
export class Users extends Model {
  @Column({ nullable: true })
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

  @OneToMany((type) => Payments, (payment) => payment.users)
  @JoinColumn({ name: 'payment_id' })
  payments: Payments;

  @OneToMany((type) => Orders, (orders) => orders.users)
  orders: Orders[];

  @OneToMany((type) => Clients, (clients) => clients.users)
  clients: Clients[];

  @OneToMany((type) => Booking, (booking) => booking.users)
  bookings: Booking[];

  @OneToMany((type)=>ExchangRates,(rates)=>rates.user_id)
  rates:ExchangRates;

  @OneToMany((type) => Towns, (towns) => towns.user)
  towns: Towns;

  @Column({
    default: 0,
  })
  tokenVersion: number;

  @Column({nullable:true})
  town_access:string;

  @Column()
  user_is_deleted: boolean;

  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    if (this.password) {
      await this.hashPassword();
    }
  }

  @BeforeUpdate()
  async hashPasswordBeforeUpdate() {
    if (this.password) {
      await this.hashPassword();
    }
  }

  async hashPassword() {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, 10);
  }

  async validatePassword(password: string): Promise<boolean> {
    const hash = await bcrypt.hash(password, 10);
    return hash === this.password;
  }
}
