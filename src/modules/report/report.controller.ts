import {Controller, Get} from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {

  }

  @Get('/listdebitors')
  public listofdebitors(){
    return this.reportService.getListOfDebitors();
  }
}
