import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreditTableService } from './credit-table.service';

@ApiTags('CreditTable')
@Controller('credit-plan')
export class CreditTableController {
  constructor(private readonly creaditTableService: CreditTableService) {}

  @Get('/all/:order_id')
  getSchedule(@Param('order_id') order_id: number) {
    return this.creaditTableService
      .getCreditTableOfClient(order_id)
      .then((data) => {
        if (data) {
          return { success: true, data, message: 'Fetched data' };
        } else {
          return { success: false, message: 'Data not found' };
        }
      });
  }
}
