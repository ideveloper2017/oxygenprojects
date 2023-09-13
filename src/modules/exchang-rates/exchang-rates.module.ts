import { Module } from '@nestjs/common';
import { ExchangRatesService } from './exchang-rates.service';
import { ExchangRatesController } from './exchang-rates.controller';

@Module({
  controllers: [ExchangRatesController],
  providers: [ExchangRatesService],
})
export class ExchangRatesModule {}
