import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    ParseIntPipe,
    Query, UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { NewPaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import { Paymentmethods } from '../../common/enums/paymentmethod';
import {AuthUser} from "../../common/decorators/auth-user.decorator";
import {JwtAuthGuard} from "../auth/jwt-auth.guard";

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('/list')
  public getAll(@Query('page') page: number,@AuthUser() user:any) {
    const limit: number = 20;
    const offset = (page - 1) * limit;

    return this.paymentsService
      .getAllPayments(offset, limit,user)
      .then((data) => {
        if (data.length != 0) {
          return { success: true, data: data, message: 'success' };
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

  @Post('/delete')
  deletePayment(@Body() id: number[]) {
    if (!id.length) {
      return { success: false, message: "ID lar jo'natilmadi" };
    }
    return this.paymentsService
      .deletePayment(id)
      .then((data) => {
        if (data == id.length) {
          return { success: true, message: 'completely deteled' };
        } else if (data < id.length) {
          return { success: false, message: 'not deleted fully' };
        } else {
          return { success: false, message: 'not deleted' };
        }
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }

  @Post('/recover')
  recoverPayment(@Body() id: number[]) {
    if (!id.length) {
      return { success: false, message: "ID lar jo'natilmadi" };
    }
    return this.paymentsService
      .recoverPayment(id)
      .then((data) => {
        if (data == id.length) {
          return { success: true, message: 'completely deteled' };
        } else if (data < id.length) {
          return { success: false, message: 'not deleted fully' };
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
