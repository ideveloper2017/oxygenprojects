import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import Model from '../../model/model.module';
import { Apartments } from '../../apartments/entities/apartment.entity';
import { Orders } from '../../orders/entities/order.entity';
import { Currencies } from '../../currencies/entities/currency.entity';
import {OrderStatus} from "../../../common/enums/order-status";

@Entity('OrderItems')
export class OrderItems extends Model {
  @ManyToOne(() => Orders, (orders) => orders.orderItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  orders: Orders;

  @Column()
  order_id: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
  })
  order_status: OrderStatus;

  @ManyToOne(() => Apartments, (apartment) => apartment.orderItems)
  @JoinColumn({ name: 'apartment_id' })
  apartments: Apartments;

  @Column()
  apartment_id: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  mk_price: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  mk_price_usd: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  price: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  price_usd: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  final_price: number;

  @ManyToOne(() => Currencies, (currency) => currency.orderitems)
  @JoinColumn({ name: 'currency_id' })
  currency: Currencies;
}
