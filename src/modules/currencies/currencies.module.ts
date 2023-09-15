import { Module } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currencies } from './entities/currency.entity';
import { ExchangRates } from '../exchang-rates/entities/exchang-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Currencies, ExchangRates])],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
  exports:[CurrenciesService]
})
export class CurrenciesModule {}
