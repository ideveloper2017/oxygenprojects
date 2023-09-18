import Model from '../../model/model.module';
import { Column, OneToMany } from 'typeorm';
import { Payments } from '../../payments/entities/payment.entity';

export class Caisher extends Model {
  @Column()
  caisher_name;

  @Column()
  is_active: boolean;

  @Column()
  is_default: boolean;

  @OneToMany(() => Payments, (payments) => payments.caishers)
  payments: Payments;
}
