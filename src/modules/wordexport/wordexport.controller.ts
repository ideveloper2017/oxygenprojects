import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
// import fs from "fs";
import {
  createDefaultPlugins,
  LOOP_CONTENT_TYPE,
  TemplateHandler,
  TEXT_CONTENT_TYPE,
} from 'easy-template-x';
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
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { CurrenciesService } from '../currencies/currencies.service';
import { ExchangRates } from '../exchang-rates/entities/exchang-rate.entity';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { FileUploadService } from '../file-upload/file-upload.service';
import { exists } from 'nestjs-i18n/dist/utils'; // ES6

@Controller('wordexport')
export class WordexportController {
  constructor(
    @InjectRepository(Orders)
    private readonly orderRepo: Repository<Orders>,
    private readonly currenciesService: CurrenciesService,
    private fileService: FileUploadService,
  ) {}
  @Get('export/:client_id')
  async exportWord(
    @Param('client_id') client_id: number,
    @Res() res,
    @Res({ passthrough: true }) response: Response,
  ) {
    let client, credits, credits_usd, creditsTotalSum, initial_pay_usd, percent;

    const order = await this.orderRepo.findOne({
      where: { id: client_id },
      relations: [
        'clients',
        'orderItems.apartments.floor.entrance.buildings.towns',
      ],
    });
    credits = await this.orderRepo.manager
      .createQueryBuilder(CreditTable, 'credits')
      .where('order_id= :order_id', { order_id: client_id })
      .select(["TO_CHAR(due_date,'DD.MM.YYYY') as due_date", 'TO_CHAR(due_amount,\'fm9999999999\') as due_amount'])
      .getRawMany();

    credits_usd = await this.orderRepo.manager
      .createQueryBuilder(CreditTable, 'credits')
      .where('order_id= :order_id', { order_id: client_id })
      .select([
        "TO_CHAR(due_date,'DD.MM.YYYY') as due_date",
        "TO_CHAR(usd_due_amount,'fm999999') as usd_due_amount",
      ])
      .getRawMany();

    const summa = await this.orderRepo.manager
      .createQueryBuilder(CreditTable, 'credits')
      .select('SUM(due_amount) as summa')
      .where('order_id= :order_id', { order_id: client_id })
      .groupBy('order_id')
      .getRawOne();

    const summa_usd = await this.orderRepo.manager
      .createQueryBuilder(CreditTable, 'credits')
      .select('SUM(usd_due_amount) as summa')
      .where('order_id= :order_id', { order_id: client_id })
      .groupBy('order_id')
      .getRawOne();

    const usdRate = await ExchangRates.findOne({ where: { is_default: true } });
    initial_pay_usd = Math.floor(order.initial_pay / usdRate.rate_value);
    percent = order?.percent;
    const file_id = order?.orderItems?.map((data) => {
      return data.apartments.file_id;
    });

    const file = await this.fileService.getFileById(file_id[0]);
    const fileobj = {
      _type: 'image',
      source: existsSync(file.path) ? fs.readFileSync(file.path) : '',
      format: file.mimetype,
      width: 550,
      height: 400,
    };
    const apartment = order?.orderItems?.map((data) => {
      return {
        order_date:
          String(order?.order_date.getDate()).padStart(2, '0') +
          '.' +
          String(order?.order_date.getMonth() + 1).padStart(2, '0') +
          '.' +
          String(order?.order_date.getFullYear()).padStart(2, '0'),
        order_number: order?.id,
        client_name:
          order?.clients?.first_name +
          ' ' +
          order?.clients?.last_name +
          ' ' +
          order?.clients?.middle_name,
        client_first_name: order?.clients?.first_name,
        client_last_name: order?.clients?.last_name,
        client_middle_name: order?.clients?.middle_name,
        tin: order?.clients?.tin,
        contact_number: order?.clients?.contact_number,
        passport_seria: order?.clients?.passport_seria,
        given_from: order?.clients?.given_from,
        client_address: order?.clients?.address,
        address: data?.apartments?.floor?.entrance?.buildings?.towns?.address,
        town_name:
          data?.apartments?.floor?.entrance?.buildings?.towns.name +
          ' ' +
          data?.apartments?.floor?.entrance?.buildings?.towns.address +
          ' ' +
          data?.apartments?.floor?.entrance?.buildings?.name,
        enterance_number: data?.apartments?.floor?.entrance?.entrance_number,
        floor_number: data?.apartments?.floor?.floor_number,
        room_space: data?.apartments?.room_space,
        room_number: data?.apartments?.room_number,
        room_cells: data?.apartments?.cells,
        credits: credits,
        credits_usd: credits_usd,
        count_month: credits.length,
        initalpay: Number(order.initial_pay),
        initial_pay_usd: initial_pay_usd,
        delevery_time:
          order?.delivery_time +
          ' (' +
          this.numberToWords(order?.delivery_time) +
          ')',
        percent: percent,
        apartment_image: fileobj,
        total_sum: (summa ? Math.floor(Number(summa.summa)) : 0) + Math.floor(Number(order.initial_pay)),
        totalsum: (summa ? Math.floor(Number(summa.summa)) : 0) + Math.floor(Number(order.initial_pay)),
        totalsum_usd: Math.round((Number((summa_usd ? summa_usd.summa : 0)) + Number(initial_pay_usd))),
        number_to_words_percent: this.numberToWords(percent),
        number_to_words_sum: this.numberToWords((summa ? Math.floor(Number(summa.summa)) : 0) + Math.floor(Number(order.initial_pay))),
      };
    });
    const data = {
      apartment,
    };

    const handler = new TemplateHandler();
    //     {
    //   plugins: createDefaultPlugins(),
    //   defaultContentType: TEXT_CONTENT_TYPE, // string
    //   containerContentType: LOOP_CONTENT_TYPE, // string
    //   delimiters: {
    //     tagStart: '{',
    //     tagEnd: '}',
    //     containerTagOpen: '#',
    //     containerTagClose: '/',
    //   },
    //
    //
    //   maxXmlDepth: 20,
    //   extensions: {
    //     // ExtensionOptions
    //     beforeCompilation: undefined, // TemplateExtension[]
    //     afterCompilation: new DataBindingExtension(), // TemplateExtension[]
    //   },
    //
    //   scopeDataResolver: undefined, // ScopeDataResolver
    // }
    const filename = 'shartnoma_oxy.docx';
    const templateFile = fs.readFileSync('data/shartnoma_oxy.docx');

    const doc = await handler.process(templateFile, data);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // You can set the appropriate MIME type
    res.send(doc);
    const fileStream = fs.createReadStream('data/' + filename);
    fileStream.pipe(res);
  }

  numberToWords(num: number): string {
    const units: string[] = ['', 'минг', 'миллион', 'миллиард', 'трилион'];
    const ones: string[] = [
      '',
      'бир',
      'икки',
      'уч',
      'тўрт',
      'беш',
      'олти',
      'етти',
      'саккиз',
      'тўққиз',
    ];
    const teens: string[] = [
      '',
      'ўн бир',
      'ўн икки',
      'ўн уч',
      'ўн тўрт',
      'ўн беш',
      'ўн олти',
      'ўн етти',
      'ўн саккиз',
      'ўн тўққиз',
    ];
    const tens: string[] = [
      '',
      'ўн',
      'йигирма',
      'ўттиз',
      'қирқ',
      'эллик',
      'олтмиш',
      'етмиш',
      'саксон',
      'тўқсон',
    ];

    function convertLessThanThousand(num: number): string {
      if (num === 0) {
        return '';
      } else if (num < 10) {
        return ones[num];
      } else if (num < 20) {
        return teens[num - 10];
      } else if (num < 100) {
        return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
      } else {
        return (
          ones[Math.floor(num / 100)] +
          ' юз ' +
          convertLessThanThousand(num % 100)
        );
      }
    }

    function convert(num: number): string {
      if (num === 0) {
        return 'zero';
      }
      let words = '';
      let i = 0;

      while (num > 0) {
        if (num % 1000 !== 0) {
          words =
            convertLessThanThousand(num % 1000) + ' ' + units[i] + ' ' + words;
        }
        num = Math.floor(num / 1000);
        i++;
      }

      return words.trim();
    }

    return convert(num);
  }

  async getDatabaseFileById(
    id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.fileService.getFileById(id);

    if (existsSync(file.path)) {
      const stream = createReadStream(join(process.cwd(), file.path));

      response.set({
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Content-Type': file.mimetype,
      });
      return new StreamableFile(stream);
    } else {
      return { success: false, message: 'image not found or may be deleted' };
    }
  }
}
