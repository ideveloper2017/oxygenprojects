import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ExchangRatesService } from './exchang-rates.service';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('Currencies')
@Controller('exchang-rates')
export class ExchangRatesController {}
