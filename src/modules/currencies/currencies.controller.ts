import {Body, Controller, Get, Param, Patch, Post, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CreatexchangeRateDto } from '../exchang-rates/dto/create-exchange-rate.dto';
import { EditExchangeRateDto } from '../exchang-rates/dto/edit-exchange-rate.dto';
import {AuthUser} from "../../common/decorators/auth-user.decorator";
import {JwtAuthGuard} from "../auth/jwt-auth.guard";

@ApiTags('Currencies')
@Controller('currency')
export class CurrenciesController {
  constructor(private readonly currancyService: CurrenciesService) {}

  @ApiOperation({ summary: "Pul birligi qo'shish" })
  @Post('/add')
  addCurrency(@Body() createCurrencyDto: CreateCurrencyDto) {
    return this.currancyService.createCurrency(createCurrencyDto);
  }

  @ApiOperation({ summary: "Pul birliklari ro'yxatini olish" })
  @Get('/list')
  viewCurrancies() {
    return this.currancyService.getCurrencies();
  }

  @ApiOperation({ summary: 'Pul birligini belgilash' })
  @Patch('/option')
  selectCurrency(@Body() currency: number[]) {
    return this.currancyService.selectCurrency(currency);
  }

  // ================================== Valyuta kursi API ================================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'valuta kursini kiritish' })
  @Post('/exchange-rate/new')
  updateExchangeRate(@AuthUser() user_id:any,@Body() exchangeRateDto: CreatexchangeRateDto) {
    return this.currancyService.newRate(exchangeRateDto,user_id).then((data) => {
      if (data) {
        return { success: true, data, message: 'Kurs yangilandi' };
      } else {
        return { success: false, message: 'Kurs yangilashda xatolik' };
      }
    });
  }

  @ApiOperation({ summary: 'Valyuta kursini tahrirlash' })
  @Get('/exchange-rate/last')
  lastChangedRate() {
    return this.currancyService
      .getLastRate()
      .then((data) => {
        if (data) {
          return { success: true, data};
        } else {
          return { success: false, message: "Kurs olishda xatolik" };
        }
      }).catch((error)=>{
          return { success: false, message: error.message};
        });
  }
  
  
    @ApiOperation({ summary: 'Valyuta kurslarini olish' })
    @Get('/get-rates')
    getRates() {
      return  this.currancyService.findRates()
    }
}
