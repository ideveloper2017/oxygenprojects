import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Clients } from '../../clients/entities/client.entity';
import { Users } from '../../users/entities/user.entity';
import { PaymentMethods } from '../../payment-method/entities/payment-method.entity';
import { OrderItems } from '../../order-items/entities/order-item.entity';
import { Payments } from '../../payments/entities/payment.entity';
import { CreditTable } from '../../credit-table/entities/credit-table.entity';

@Entity('Orders')
export class Orders extends Model {
  @ManyToOne((type) => Clients, (clients) => clients.orders)
  @JoinColumn({ name: 'client_id' })
  clients: Clients;

  // @Column({ type: 'integer' })
  // client_id: number;

  @ManyToOne((type) => Users, (users) => users.orders)
  @JoinColumn({ name: 'user_id' })
  users: Users;

  // @Column({ type: 'integer' })
  // user_id: number;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  initial_pay: number;

  @Column()
  total_amount: number;

  @Column()
  is_accepted: boolean;

  @Column()
  order_date: Date;

  @Column({ enum: ['active', 'inactive'] })
  order_status: string;

  @ManyToOne(
    (type) => PaymentMethods,
    (paymentMethods) => paymentMethods.orders,
  )
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethods: PaymentMethods;

  @Column()
  payment_method_id: number;

  @OneToMany(() => OrderItems, (orderItems) => orderItems.orders)
  orderItems: OrderItems[];

  @OneToMany(() => Payments, (payments) => payments.orders)
  payments: Payments[];

  @OneToMany(() => CreditTable, (creditTable) => creditTable.orders)
  creditTables: CreditTable[];
}
