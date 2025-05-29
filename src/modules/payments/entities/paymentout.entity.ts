import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Table } from 'typeorm';
import Model from '../../model/model.module';
import { Caisher } from '../../caisher/entities/caisher.entity';
import { Caishertype } from '../../../common/enums/caishertype';
import { Paymentmethods } from '../../../common/enums/paymentmethod';
import { PaymentStatus } from '../../../common/enums/payment-status';
import { Users } from '../../users/entities/user.entity';
import { Orders } from '../../orders/entities/order.entity';
import { Clients } from '../../clients/entities/client.entity';
import { Payments } from './payment.entity';

@Entity('PaymentOut')
export  class PaymentOut extends Model {

  @ManyToOne(() => Users, (users) => users.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  users: Users;

  @Column()
  user_id: number;

  @ManyToOne(() => Clients, (clients) => clients.paymentsout, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  clients: Clients;

  @Column()
  client_id: number;

  // @ManyToOne(() => Payments, (payment) => payment.paymentOut, { nullable: true, onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'payment_id' })
  // payment: Payments;
  //
  // @Column({nullable:true})
  // payment_id: number;


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

  @Column({ nullable: true })
  pay_note: string;

}