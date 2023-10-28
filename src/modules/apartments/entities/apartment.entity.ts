import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import Model from '../../model/model.module';
import { Floor } from '../../floor/entities/floor.entity';
import { Price } from '../../price/entities/price.entity';
import { OrderItems } from '../../order-items/entities/order-item.entity';
import { FileUpload } from 'src/modules/file-upload/entities/file-upload.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { ApartmentStatus } from '../../../common/enums/apartment-status';
import {PositionStatus} from "../../../common/enums/PositionStatus";

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

  @Column({ type: 'enum', enum: ApartmentStatus, nullable: true })
  status: ApartmentStatus;

  @Column({type:'enum',enum:PositionStatus,nullable:true})
  position:PositionStatus;

  @OneToMany((type) => Price, (price) => price.apartment_id)
  price: Price[];

  @OneToMany(() => OrderItems, (orderItems) => orderItems.apartments)
  orderItems: OrderItems[];

  @OneToOne(() => FileUpload, (files) => files.apartment, {onDelete: "SET NULL", onUpdate: "CASCADE"})
  @JoinColumn({ name: 'file_id' })
  file: FileUpload;

  @Column({ nullable: true })
  file_id: number;

  @OneToMany(() => Booking, (booking) => booking.apartments)
  bookings: Booking[];

}
