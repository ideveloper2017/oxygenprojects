import Model from '../../model/model.module';
import { Column, Entity, OneToMany } from 'typeorm';
import { Payments } from '../../payments/entities/payment.entity';

@Entity('Caisher')
export class Caisher extends Model {
  @Column()
  caisher_name: string;

  @Column()
  is_active: boolean;

  @Column()
  is_default: boolean;

  @OneToMany(() => Payments, (payments) => payments.caishers, {
    onDelete: 'CASCADE',
  })
  payments: Payments;
}
