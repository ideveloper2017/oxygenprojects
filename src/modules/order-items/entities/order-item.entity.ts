import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Apartments } from '../../apartments/entities/apartment.entity';
import { Orders } from '../../orders/entities/order.entity';

@Entity('OrderItems')
export class OrderItems extends Model {
  @ManyToOne(() => Orders, (orders) => orders.orderItems)
  @JoinColumn({ name: 'order_id' })
  orders: Orders;

  @ManyToOne(() => Apartments, (apartment) => apartment.orderItems)
  @JoinColumn({ name: 'apartment_id' })
  apartments: Apartments;



  @Column({nullable:true})
  final_price: number;
}
