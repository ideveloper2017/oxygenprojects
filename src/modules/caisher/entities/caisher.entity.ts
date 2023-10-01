import Model from '../../model/model.module';
import {Column, Entity, JoinColumn, ManyToOne, OneToMany} from 'typeorm';
import { Payments } from '../../payments/entities/payment.entity';
import {Towns} from "../../towns/entities/town.entity";

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

  @ManyToOne((type)=>Towns,(towns)=>{towns.caisher})
  @JoinColumn({name:"town_id"})
  towns:Towns;
}
