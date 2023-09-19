import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import Model from '../../model/model.module';
import { Orders } from '../../orders/entities/order.entity';
import { Caisher } from '../../caisher/entities/caisher.entity';
import { Paymentmethods } from '../../../common/enums/paymentmethod';
import { Caishertype } from '../../../common/enums/caishertype';
import { Users } from '../../users/entities/user.entity';

@Entity('Payments')
export class Payments extends Model {

  @ManyToOne(() => Users, (users) => users.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  users: Users;

  @OneToMany(() => Orders, (orders) => orders.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  orders: Orders;

  @ManyToOne(() => Caisher, (caisher) => caisher.payments)
  @JoinColumn({ name: 'caisher_id' })
  caishers: Caisher;

  @Column()
  order_id: number;

  @Column()
  payment_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'enum', enum: Caishertype, default: Caishertype.IN })
  caisher_type: Caishertype;

  @Column({
    type: 'enum',
    enum: Paymentmethods,
    default: Paymentmethods.CASH,
  })
  paymentmethod: Paymentmethods;
}
