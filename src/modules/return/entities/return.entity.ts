import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import Model from '../../model/model.module';
import { Clients } from '../../clients/entities/client.entity';
import { Users } from '../../users/entities/user.entity';

@Entity('Returns')

export class Returns extends Model {
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

  @Column({ enum: ['active', 'inactive'] })
  order_status: string;
}
