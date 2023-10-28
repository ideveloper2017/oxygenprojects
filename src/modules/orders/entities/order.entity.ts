import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Clients } from '../../clients/entities/client.entity';
import { Users } from '../../users/entities/user.entity';
import { PaymentMethods } from '../../payment-method/entities/payment-method.entity';
import { OrderItems } from '../../order-items/entities/order-item.entity';
import { Payments } from '../../payments/entities/payment.entity';
import { CreditTable } from '../../credit-table/entities/credit-table.entity';
import { OrderStatus } from '../../../common/enums/order-status';
import { Paymentmethods } from '../../../common/enums/paymentmethod';

@Entity('Orders')
export class Orders extends Model {
  @ManyToOne((type) => Clients, (clients) => clients.orders)
  @JoinColumn({ name: 'client_id' })
  clients: Clients;

  @ManyToOne((type) => Users, (users) => users.orders)
  @JoinColumn({ name: 'user_id' })
  users: Users;

  @Column({nullable:true})
  percent:number;

  @Column()
  quantity: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  initial_pay: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  currency_value: number;

  @Column({ nullable: true, type: 'decimal', precision: 20, scale: 2 })
  total_amount: number;

  @Column({ type: 'float', nullable: true })
  total_amount_usd: number;

  @Column()
  order_date: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
  })
  order_status: OrderStatus;

  @Column({ default: false })
  is_deleted: boolean;

  @ManyToOne(
    (type) => PaymentMethods,
    (paymentMethods) => paymentMethods.orders,
  )
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethods: PaymentMethods;

  @OneToMany(() => OrderItems, (orderItems) => orderItems.orders)
  orderItems: OrderItems[];

  @OneToMany(() => Payments, (payments) => payments.orders)
  payments: Payments[];

  @OneToMany(() => CreditTable, (creditTable) => creditTable.orders)
  creditTables: CreditTable[];
}
