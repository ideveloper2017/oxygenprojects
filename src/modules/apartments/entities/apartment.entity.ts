import {
  Column,
  Entity,
  getConnection,
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
import {Query} from "@nestjs/common";

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

  @OneToMany((type) => Price, (price) => price.apartment_id)
  price: Price[];

  @OneToMany(() => OrderItems, (orderItems) => orderItems.apartments)
  orderItems: OrderItems[];

  @OneToOne(() => FileUpload, (files) => files.apartment)
  @JoinColumn({ name: 'file_id' })
  file: FileUpload;

  @Column({ nullable: true })
  file_id: number;

  @OneToMany(() => Booking, (booking) => booking.apartments)
  bookings: Booking[];

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Query(() => Promise<any>)
  public static async customQuery(): Promise<any> {
    const query = 'SELECT * FROM Apartments';
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();
    const result = await queryRunner.query(query);
    await queryRunner.release();
    return result;
  }
}


