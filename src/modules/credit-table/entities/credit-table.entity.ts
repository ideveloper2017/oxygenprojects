import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Orders } from '../../orders/entities/order.entity';
import Model from '../../model/model.module';
@Entity('CreditTable')
export class CreditTable extends Model {
  @ManyToOne(() => Orders, (orders) => orders.creditTables, {onDelete: 'CASCADE'})
  @JoinColumn({ name: 'order_id' })
  orders: Orders;
  
  @Column()
  order_id: number
  
  @Column({ type: 'float' })
  due_amount: number;
 
  @Column({ type: 'float' })
  left_amount: number;

  @Column({ enum: ['paid', 'waiting', 'unpaid'] })
  status: string;

  @Column()
  due_date: Date;
}
