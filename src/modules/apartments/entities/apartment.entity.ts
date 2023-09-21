import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { Floor } from '../../floor/entities/floor.entity';
import { Price } from '../../price/entities/price.entity';
import { OrderItems } from "../../order-items/entities/order-item.entity";
import { FileUpload } from 'src/modules/file-upload/entities/file-upload.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';

@Entity('Apartments')
export class Apartments extends Model {
  @ManyToOne((type) => Floor, (floor) => floor.apartments)
  @JoinColumn({ name: 'floor_id' })
  floor: Floor;

  @Column()
  floor_id: number;

  @Column({ nullable: true })
  room_number: number;

  @Column({ nullable: true })
  cells: number;

  @Column({ type: 'float', nullable: true })
  room_space: number;

  @Column({ enum: ['free', 'sold', 'bron', 'inactive'], nullable: true })
  status: string;

  @OneToMany((type) => Price, (price) => price.apartment_id)
  price: Price[];

  @OneToMany(() => OrderItems, (orderItems) => orderItems.apartments)
  orderItems: OrderItems[];
  
  @OneToMany(() => FileUpload, (files) => files.apartment)
  files: FileUpload[];
  
  @OneToMany(() => Booking, (booking) => booking.apartments)
  bookings: Booking[];
}
