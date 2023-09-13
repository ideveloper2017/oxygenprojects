import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import Model from '../../model/model.module';
import { Currencies } from '../../currencies/entities/currency.entity';

@Entity('ExchangeRates')
export class ExchangRates extends Model {
  @Column({ type: 'float' })
  rate_value: number;

  @Column()
  is_default: boolean;

  @ManyToOne(() => Currencies, (currencies) => currencies.exchangeRates)
  @JoinColumn({ name: 'currency_id' })
  currencies: Currencies;

  @Column()
  currency_id: number;
}
