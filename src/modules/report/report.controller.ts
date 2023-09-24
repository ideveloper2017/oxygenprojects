import {Controller, Get} from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {

  }

  @Get('/listdebitors')
  public listofdebitors(){
    return this.reportService.getListOfDebitors().then((data)=>{
      if (data.length>0){
        return {status:200,data:data,message:'Fetch all records!!!'}
      } else {
        return {status:200,data:[],message:'Fetch all records!!!'}
      }
    }).catch((error)=>{
      return {status:400,message:error.message}
    });
  }
}
