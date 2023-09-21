import {Controller, Get, Param, ParseIntPipe, Res} from '@nestjs/common';
// import fs from "fs";
import {TemplateHandler} from "easy-template-x";
import {OrdersService} from "../orders/orders.service";
import {InjectRepository} from "@nestjs/typeorm";
import {Orders} from "../orders/entities/order.entity";
import {FindOptionsWhere, Repository} from "typeorm";
import {Clients} from "../clients/entities/client.entity";
const fs=require('fs');
@Controller('wordexport')
export class WordexportController {

  constructor(
      @InjectRepository(Orders)
      private readonly orderRepo:Repository<Orders>) {
  }
  @Get('export/:client_id')
  async exportWord(@Param('client_id') client_id:number,@Res() res) {
    let client;
    const filename = 'data/contract.docx';
    const templateFile = fs.readFileSync('data/contract.docx');


    client=  await this.orderRepo.manager.getRepository(Clients).findOne({where:{id:client_id}}).then(data=>{return data});
    const order=await this.orderRepo.findOne({where:{clients:client },relations:['clients']});
    const data = {
      orders: [
        { order_number: order?.id,client_name:order?.clients?.first_name+' '+order?.clients?.last_name},
      ]
    };

    const handler = new TemplateHandler();
    const doc = await handler.process(templateFile, data);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // You can set the appropriate MIME type
    res.send(doc)
    const fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
    // fs.writeFileSync('myTemplate - output.docx', doc);
  }


}
