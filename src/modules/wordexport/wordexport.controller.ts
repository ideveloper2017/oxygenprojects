import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
// import fs from "fs";
  import {createDefaultPlugins, LOOP_CONTENT_TYPE, TemplateHandler, TEXT_CONTENT_TYPE} from 'easy-template-x';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Clients } from '../clients/entities/client.entity';
import { numberToWords } from '../../common/utils/numbertowords';
const fs = require('fs');
import numberToWordsRu, {
  convert as convertNumberToWordsRu,
} from 'number-to-words-ru';
import {CreditTable} from "../credit-table/entities/credit-table.entity";
import {CurrenciesService} from "../currencies/currencies.service";
import {ExchangRates} from "../exchang-rates/entities/exchang-rate.entity"; // ES6

@Controller('wordexport')
export class WordexportController {
  constructor(
    @InjectRepository(Orders)
    private readonly orderRepo: Repository<Orders>,
    private readonly currenciesService: CurrenciesService,
  ) {}
  @Get('export/:client_id')
  async exportWord(@Param('client_id') client_id: number, @Res() res) {
    let client,credits,credits_usd, creditsTotalSum,initial_pay_usd;
    const filename = 'data/contract.docx';
    const templateFile = fs.readFileSync('data/contract.docx');

    // client=  await this.orderRepo.manager.getRepository(Clients).findOne({where:{id:client_id}});
    const order = await this.orderRepo.findOne({
      where: { id: client_id },
      relations: [
        'clients',
        'orderItems.apartments.floor.entrance.buildings.towns',
       ],
    });
    credits= await this.orderRepo.manager.createQueryBuilder(CreditTable,'credits')
        .where('order_id= :order_id',{order_id:client_id})
        .select(['TO_CHAR(due_date,\'DD.MM.YYYY\') as due_date','due_amount'])
        .getRawMany();

    credits_usd= await this.orderRepo.manager.createQueryBuilder(CreditTable,'credits')
        .where('order_id= :order_id',{order_id:client_id})
        .select(['TO_CHAR(due_date,\'DD.MM.YYYY\') as due_date','usd_due_amount'])
        .getRawMany();

      const summa=await this.orderRepo.manager.createQueryBuilder(CreditTable,'credits')
        .select("SUM(due_amount) as summa")
        .where('order_id= :order_id',{order_id:client_id})
          .groupBy('order_id')
        .getRawOne();

    const summa_usd=await this.orderRepo.manager.createQueryBuilder(CreditTable,'credits')
        .select("SUM(usd_due_amount) as summa")
        .where('order_id= :order_id',{order_id:client_id})
        .groupBy('order_id')
        .getRawOne();

    const usdRate = await ExchangRates.findOne({ where: { is_default: true } });

    if (order.paymentMethods.name_alias === 'dollar') {
      initial_pay_usd = Math.floor(order.initial_pay / usdRate.rate_value);
    } else {
      initial_pay_usd = Math.floor(order.initial_pay * usdRate.rate_value);
    }

    const apartment =order?.orderItems?.map((data) => {
      return {
        order_date: String(order?.order_date.getDate()).padStart(2,'0')+'.'+String((order?.order_date.getMonth()+1)).padStart(2,'0')+'.'+String(order?.order_date.getFullYear()).padStart(2,'0'),
        order_number: order?.id,
        client_name:
          order?.clients?.first_name + ' ' + order?.clients?.last_name,
        client_first_name:order?.clients?.first_name,
        client_last_name:order?.clients?.last_name,
        client_middle_name:order?.clients?.middle_name,
        tin: order?.clients?.tin,
        contact_number: order?.clients?.contact_number,
        passport_seria: order?.clients?.passport_seria,
        given_from: order?.clients?.given_from,
        client_address: order?.clients?.address,
        address: data?.apartments?.floor?.entrance?.buildings?.towns?.address,
        town_number: data?.apartments?.floor?.entrance?.buildings?.towns.id,
        enterance_number: data?.apartments?.floor?.entrance?.entrance_number,
        floor_number: data?.apartments?.floor?.floor_number,
        room_space: data?.apartments?.room_space,
        room_number: data?.apartments?.room_number,
        total_sum:order.total_amount,
        total_sum_usd:order.total_amount_usd,
        credits:credits,
        credits_usd:credits_usd,
        count_month:credits.length,
        initalpay:order.initial_pay,
        initial_pay_usd:initial_pay_usd,
        totalsum:(summa?summa.summa:0)+ +order.initial_pay,
        totalsum_usd:(summa_usd?summa_usd.summa:0)+ +initial_pay_usd,
        number_to_words: numberToWordsRu.convert(
          Number(
            data?.apartments?.floor?.entrance?.buildings?.mk_price *
              data?.apartments?.room_space,
          ),
          {
            convertNumberToWords: {
              fractional: false,
            },
          },
        ),
      };
    });
    const data = {
      apartment
    };

    console.log(data);
    const handler = new TemplateHandler({

      plugins: createDefaultPlugins(),
      defaultContentType: TEXT_CONTENT_TYPE, // string
      containerContentType: LOOP_CONTENT_TYPE, // string
      delimiters: {
        tagStart: "{",
        tagEnd: "}",
        containerTagOpen: "#",
        containerTagClose: "/"
      },

      maxXmlDepth: 20,
      extensions: { // ExtensionOptions
        beforeCompilation: undefined, // TemplateExtension[]
        afterCompilation: undefined // TemplateExtension[]
      },

      scopeDataResolver: undefined // ScopeDataResolver
    });
    const doc = await handler.process(templateFile, data);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // You can set the appropriate MIME type
    res.send(doc);
    const fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
  }



}
