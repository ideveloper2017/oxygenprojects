import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import Model from '../../model/model.module';
import { Orders } from '../../orders/entities/order.entity';
import { Caisher } from '../../caisher/entities/caisher.entity';
import { Paymentmethods } from '../../../common/enums/paymentmethod';

@Entity('Payments')
export class Payments extends Model {
  @ManyToOne(() => Orders, (orders) => orders.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  orders: Orders;

  @ManyToOne(() => Caisher, (caisher) => caisher.payments)
  @JoinColumn({ name: 'caisher_id' })
  caishers: Caisher;

  @Column()
  order_id: number;

  @Column()
  payment_date: Date;

  @Column()
  amount: number;

  @Column({
    type: 'enum',
    enum: Paymentmethods,
    default: Paymentmethods.CASH,
  })
  paymentmethod: Paymentmethods;

  // @Column({ default: false, type: 'boolean' })
  // in_cash: boolean;
  //
  // @Column({ default: false, type: 'boolean' })
  // by_card: boolean;
  //
  // @Column({ default: false, type: 'boolean' })
  // bank: boolean;
}

// @ManyToOne((type) => Sale_details)
// @JoinColumn({ name: 'sale_details_id' })
