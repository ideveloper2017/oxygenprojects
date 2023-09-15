import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currencies } from './entities/currency.entity';
import { ExchangRates } from '../exchang-rates/entities/exchang-rate.entity';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CreatexchangeRateDto } from '../exchang-rates/dto/create-exchange-rate.dto';
import { EditExchangeRateDto } from '../exchang-rates/dto/edit-exchange-rate.dto';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currencies)
    private readonly currencyRepo: Repository<Currencies>,
    @InjectRepository(ExchangRates)
    private readonly exchangeRepo: Repository<ExchangRates>,
  ) {}

  async createCurrency(createCurrencyDto: CreateCurrencyDto) {
    const currency = new Currencies();
    currency.name = createCurrencyDto.name;
    currency.is_selected = createCurrencyDto.is_selected;

    const result = await this.currencyRepo.save(currency);
    return {
      status: 201,
      data: result,
      message: 'Currency added successfully!',
    };
  }

  async getCurrencies() {
    const currencies = await this.currencyRepo.find();
    return { status: 200, data: currencies, message: 'Success' };
  }

  async selectCurrency(arrayOfId: number[]) {
    for (const id of arrayOfId) {
      await this.currencyRepo.update({ id: id }, { is_selected: true });
    }
    return { status: 200, data: [], message: 'Success' };
  }

  //====================================== EchangeRates Repository logic ===========================

  async newRate(exchangeRateDto: CreatexchangeRateDto) {
    const rate = new ExchangRates();
    rate.rate_value = exchangeRateDto.rate_value;
    rate.currency_id = exchangeRateDto.currency_id;
    rate.is_default = true

    await this.exchangeRepo.update({}, { is_default: false });

    const savedRate = await this.exchangeRepo.save(rate);
    return savedRate;
  }

  async updateCurrancyRate(
    id: number,
    editExcahangeRateDto: EditExchangeRateDto,
  ) {
    const editRate = await this.exchangeRepo.update(
      { id: id },
      editExcahangeRateDto,
    );
    return editRate;
  }

  async getLastRate() {
    return await this.exchangeRepo
    .createQueryBuilder('exchangeRate')
    .where('is_default = :val', {val:true})
    .orderBy('id','DESC')
    .getOne();
  }
}
