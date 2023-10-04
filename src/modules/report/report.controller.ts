import {Controller, Get, Param} from '@nestjs/common';
import { ReportService } from './report.service';
import { ApiTags } from '@nestjs/swagger';
import {Apartments} from "../apartments/entities/apartment.entity";
import * as moment from 'moment';

@Controller('report')
@ApiTags('Reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('/listdebitors')
  public listofdebitors() {
    return this.reportService
      .getListOfDebitors()
      .then((data) => {
        if (data.length > 0) {
          return { status: 200, data: data, message: 'Fetch all records!!!' };
        } else {
          return { status: 400, data: [], message: 'Fetch all records!!!' };
        }
      })
      .catch((error) => {
        return { status: 400, message: error.message };
      });
  }

  @Get('/order-apartments')
  async listOrders() {
    return this.reportService.getListByApartment();
  }

  @Get('/all-payment/:from/:to')
  async listPayments(@Param('from') from:string, @Param('to') to:string){
      const dateObjectFrom: moment.Moment = moment(from);
      const startDate: string = dateObjectFrom.format("YYYY-MM-DD");
      const dateObjectTo: moment.Moment = moment(to);
      const endDate: string = dateObjectTo.format("YYYY-MM-DD");
     return this.reportService.allPayment('day',startDate,endDate).then((data)=>{
       if (data){
         return {status:200,data:data,message:"All Payments!!!"}
       } else  {
         return {status: 400,message:"not payment"}
       }
     }).catch((error)=>{
       return {status:error.code,message:error.message}
     });
  }
}
