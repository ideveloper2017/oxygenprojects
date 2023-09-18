import { Column, Entity, OneToMany } from 'typeorm';
import Model from '../../model/model.module';
import { ExchangRates } from '../../exchang-rates/entities/exchang-rate.entity';

@Entity('Currencies')
export class Currencies extends Model {
  @Column({ unique: true })
  name: string;

  @Column()
  is_selected: boolean;

  @OneToMany(() => ExchangRates, (exchangeRate) => exchangeRate.currencies)
  exchangeRates: ExchangRates[];

}
