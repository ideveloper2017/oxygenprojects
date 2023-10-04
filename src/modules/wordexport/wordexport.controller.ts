import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
// import fs from "fs";
import { TemplateHandler } from 'easy-template-x';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Clients } from '../clients/entities/client.entity';
import { numberToWords } from '../../common/utils/numbertowords';
const fs = require('fs');
import numberToWordsRu, {
  convert as convertNumberToWordsRu,
} from 'number-to-words-ru'; // ES6

@Controller('wordexport')
export class WordexportController {
  constructor(
    @InjectRepository(Orders)
    private readonly orderRepo: Repository<Orders>,
  ) {}
  @Get('export/:client_id')
  async exportWord(@Param('client_id') client_id: number, @Res() res) {
    let client;
    const filename = 'data/contract.docx';
    const templateFile = fs.readFileSync('data/contract.docx');

    const order = await this.orderRepo.manager
      .createQueryBuilder(Orders, 'orders')
      .leftJoin(
        'orders.orderItems',
        'orderitems',
        'orderitems.order_id=orders.id',
      )
      .leftJoin(
        'orderitems.apartments',
        'apartments',
        'apartments.id=orderitems.apartment_id',
      )
      .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
      .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
      .leftJoin(
        'entrance.buildings',
        'buildings',
        'buildings.id=entrance.building_id',
      )
      .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')
      .where('orders.id= :id', { id: client_id })
      .getRawOne();

    // relations: [
    //   'clients',
    //   'orderItems.apartments.floor.entrance.buildings.towns',
    // ],
    // });

    const apartment = order?.orderItems?.map((data) => {
      return {
        order_date: order.order_date,
        order_number: order?.id,
        client_name:
          order?.clients?.first_name + ' ' + order?.clients?.last_name,
        contact_number: order?.clients?.contact_number,
        passport_seria: order?.clients?.passport_seria,
        given_date: order?.clients?.given_date,
        given_from: order?.clients?.given_from,
        client_address: order?.clients?.address,
        address: data?.apartments?.floor?.entrance?.buildings?.towns?.address,
        floor_number: data?.apartments?.floor?.floor_number,
        room_space: data?.apartments?.room_space,
        room_number: data?.apartments?.room_number,
        total_sum:
          data?.apartments?.floor?.entrance?.buildings?.mk_price *
          data?.apartments?.room_space,
        // number_to_words:Number(data?.apartments?.floor?.entrance?.buildings?.mk_price*data?.apartments?.room_space)
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
      apartment,
    };

    const handler = new TemplateHandler();
    const doc = await handler.process(templateFile, data);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // You can set the appropriate MIME type
    res.send(doc);
    const fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
  }
}
