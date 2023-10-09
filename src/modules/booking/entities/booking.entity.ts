import { Apartments } from 'src/modules/apartments/entities/apartment.entity';
import { Clients } from 'src/modules/clients/entities/client.entity';
import Model from 'src/modules/model/model.module';
import { Users } from 'src/modules/users/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('Booking')
export class Booking extends Model {
  @ManyToOne((type) => Clients, (clients) => clients.bookings)
  @JoinColumn({ name: 'client_id' })
  clients: Clients;

  // @Column()
  // client_id: number

  @ManyToOne((type) => Users, (users) => users.bookings)
  @JoinColumn({ name: 'user_id' })
  users: Users;

  @ManyToOne((type) => Apartments, (apartment) => apartment.bookings)
  @JoinColumn({ name: 'apartment_id' })
  apartments: Apartments;

  @Column()
  apartment_id: number
  
  @Column()
  bron_date: Date;

  @Column({ nullable: true, type: "decimal", precision: 20, scale :2 })
  bron_amount: number;

  @Column({ nullable: true })
  bron_expires: Date;

  @Column()
  bron_is_active: boolean;
}
