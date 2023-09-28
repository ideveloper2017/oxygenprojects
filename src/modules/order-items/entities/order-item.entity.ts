import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import Model from '../../model/model.module';
import { Apartments } from '../../apartments/entities/apartment.entity';
import { Orders } from '../../orders/entities/order.entity';
import { Currencies } from '../../currencies/entities/currency.entity';

@Entity('OrderItems')
export class OrderItems extends Model {
  @ManyToOne(() => Orders, (orders) => orders.orderItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  orders: Orders;

  @ManyToOne(() => Apartments, (apartment) => apartment.orderItems)
  @JoinColumn({ name: 'apartment_id' })
  apartments: Apartments;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  final_price: number;

  @ManyToOne(() => Currencies, (currency) => currency.orderitems)
  @JoinColumn({ name: 'currency_id' })
  currency: Currencies;
}
