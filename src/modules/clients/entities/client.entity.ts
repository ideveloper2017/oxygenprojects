import {Column, Entity, JoinColumn, ManyToOne, OneToMany} from 'typeorm';
import Model from '../../model/model.module';
import { Orders } from '../../orders/entities/order.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import {Users} from "../../users/entities/user.entity";

@Entity('Clients')
export class Clients extends Model {
  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  middle_name: string;

  @Column()
  tin:string;

  @Column({ enum: ['male', 'female'] })
  gender: string;

  @Column({ enum: ['jismoniy', 'yuridik'] })
  type: string;

  @Column()
  address: string;

  @Column({ unique: true })
  contact_number: string;

  @Column({ nullable: true })
  date_of_birth: Date;

  @Column({ nullable: false, unique: true })
  passport_seria: string;

  @Column({ nullable: false })
  given_from: string;

  @Column({ nullable: true })
  given_date: Date;

  @Column({ nullable: true })
  untill_date: Date;

  @Column({ nullable: true })
  legal_address: string;

  @Column({ nullable: true })
  registered_address: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany((type) => Orders, (orders) => orders.clients)
  orders: Orders[];

  @ManyToOne((type)=>Users,(users)=>users.clients)
  @JoinColumn({ name: 'user_id' })
  users: Users;

  @Column()
  user_id:number;

  @OneToMany((type) => Booking, (booking) => booking.clients)
  bookings: Booking[];
}
