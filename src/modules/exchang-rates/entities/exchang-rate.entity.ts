import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import Model from '../../model/model.module';
import { Currencies } from '../../currencies/entities/currency.entity';
import {Users} from "../../users/entities/user.entity";

@Entity('ExchangeRates')
export class ExchangRates extends Model {
  @Column({ type: 'float' })
  rate_value: number;

  @Column()
  is_default: boolean;

  @ManyToOne((type)=>Users,(users)=>users.rates)
  @JoinColumn({name:"user_id"})
  users:Users;

  @Column({nullable:true})
  user_id:number;

  @ManyToOne(() => Currencies, (currencies) => currencies.exchangeRates)
  @JoinColumn({ name: 'currency_id' })
  currencies: Currencies;

}
