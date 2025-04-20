import {Column, Entity, JoinColumn, ManyToOne, OneToMany} from 'typeorm';
import { Orders } from '../../orders/entities/order.entity';
import Model from '../../model/model.module';
import {Payments} from "../../payments/entities/payment.entity";
@Entity('CreditTable')
export class CreditTable extends Model {
  @ManyToOne(() => Orders, (orders) => orders.creditTables, {onDelete: 'CASCADE'})
  @JoinColumn({ name: 'order_id' })
  orders: Orders;

  @OneToMany(() => Payments, (payment) => payment.credittable,{nullable: true,
    onDelete: 'CASCADE'})
  payments: Payments[];
  
  @Column()
  order_id: number
  
  @Column({ type: 'float' })
  due_amount: number;
  
  @Column({ type: 'float' })
  usd_due_amount: number
  
  @Column({ type: 'float' })
  currency_value: number

  @Column({ type: 'float' })
  left_amount: number;

  @Column({ type: 'float', nullable:true  })
  paid_amount: number;

  @Column({ enum: ['paid', 'waiting', 'unpaid'] })
  status: string;

  @Column()
  due_date: Date;
}
