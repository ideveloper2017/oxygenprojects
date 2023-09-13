import { Column, Entity, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Orders } from '../../orders/entities/order.entity';

@Entity('PaymentMethods')
export class PaymentMethods extends Model {
  @Column({ unique: true })
  name: string;

  @Column()
  is_active: boolean;

  @OneToMany((type) => Orders, (orders) => orders.paymentMethods)
  orders: Orders[];
}
