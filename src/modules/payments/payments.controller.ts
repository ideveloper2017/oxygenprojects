import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { NewPaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Paymentmethods } from '../../common/enums/paymentmethod';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('/list')
  public getAll() {
    return this.paymentsService
      .getAll()
      .then((data) => {
        if (data.length != 0) {
          // data.map((data) => {
          return { success: true, data: data, message: 'success' };
          // });
        } else {
          return { success: false, message: 'not found record!!!' };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }

  @Patch('/update/:id')
  public updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() newPaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentsService
      .update(id, newPaymentDto)
      .then((data) => {
        if (data.affected > 0) {
          return { success: true, message: 'update' };
        } else {
          return { success: false, message: 'not update' };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }

  @Delete('/delete/:id')
  deletePayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService
      .delete(id)
      .then((data) => {
        if (data.affected > 0) {
          return { success: true, message: 'deteled' };
        } else {
          return { success: false, message: 'not deleted' };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }
  @ApiOperation({ summary: "To'lov amalga oshirish" })
  @Post('/new-payment')
  newPayment(@Body() newPaymentDto: NewPaymentDto) {
    return this.paymentsService
      .newPayment(newPaymentDto)
      .then((data) => {
        if (!data) {
          return { success: false, message: 'Payment was not created' };
        } else {
          return { success: true, message: 'Payment created' };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }
}
