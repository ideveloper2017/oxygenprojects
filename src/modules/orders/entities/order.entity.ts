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

  @Column()
  quantity: number;

  @Column({ nullable: true })
  initial_pay: number;

  @Column({ nullable: true })
  total_amount: number;

  @Column()
  order_date: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
  })
  order_status: OrderStatus;

  @Column()
  order_id_active: boolean
 
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
