import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Orders } from '../../orders/entities/order.entity';
import { Caisher } from '../../caisher/entities/caisher.entity';
import { Paymentmethods } from '../../../common/enums/paymentmethod';
import { Caishertype } from '../../../common/enums/caishertype';
import { Users } from '../../users/entities/user.entity';
import { PaymentStatus } from '../../../common/enums/payment-status';

@Entity('Payments')
export class Payments extends Model {
  @ManyToOne(() => Users, (users) => users.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  users: Users;

  @ManyToOne(() => Orders, (orders) => orders.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  orders: Orders;

  @Column()
  order_id: number;

  @ManyToOne(() => Caisher, (caisher) => caisher.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'caisher_id' })
  caishers: Caisher;

  @Column()
  payment_date: Date;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currency_amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  currency_value: number;

  @Column({ type: 'enum', enum: Caishertype, default: Caishertype.IN })
  caisher_type: Caishertype;

  @Column({
    type: 'enum',
    enum: Paymentmethods,
    default: Paymentmethods.CASH,
  })
  paymentmethods: Paymentmethods;

  @Column({ type: 'enum', enum: PaymentStatus })
  payment_status: PaymentStatus;

  @Column({ nullable: true })
  pay_note: string;
}
