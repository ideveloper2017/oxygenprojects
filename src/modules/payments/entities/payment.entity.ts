import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Orders } from '../../orders/entities/order.entity';
import { Caisher } from '../../caisher/entities/caisher.entity';
import { Paymentmethods } from '../../../common/enums/paymentmethod';
import { Caishertype } from '../../../common/enums/caishertype';
import { Users } from '../../users/entities/user.entity';
import { PaymentStatus } from '../../../common/enums/payment-status';
import { CreditTable } from '../../credit-table/entities/credit-table.entity';
import { PaymentOut } from './paymentout.entity';
import { Clients } from '../../clients/entities/client.entity';

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

  @ManyToOne(() => Clients, (clients) => clients.paymentsout, {nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  clients: Clients;

  @Column({nullable: true})
  client_id: number;

  @ManyToOne(() => CreditTable, (credittable) => credittable.payments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credit_table_id' })
  credittable: CreditTable;

  @OneToMany(() => PaymentOut, (paymentOut) => paymentOut.payment,{nullable: true,
    onDelete: 'CASCADE'})
  paymentOut: PaymentOut[];



  @Column({ nullable: true})
  credit_table_id: number;

  @ManyToOne(() => Caisher, (caisher) => caisher.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'caisher_id' })
  caishers: Caisher;

  @Column()
  caisher_id: number;

  @Column()
  payment_date: Date;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  amount_usd: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  currency_value: number;

  @Column({ type: 'enum', enum: Caishertype, default: Caishertype.IN })
  caisher_type: Caishertype;

  @Column({ type: 'enum', enum: Paymentmethods, default: Paymentmethods.CASH })
  paymentmethods: Paymentmethods;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PAID })
  payment_status: PaymentStatus;

  @Column({ nullable: true })
  pay_note: string;

  @Column({ default: false })
  is_deleted: boolean;
}
