import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { NewPaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({summary: "To'lov amalga oshirish"})
  @Post('/new-payment')
  newPayment(@Body() newPaymentDto: NewPaymentDto){
    return this.paymentsService.newPayment(newPaymentDto).then(data => {
      if(!data){
        return {success: false , message: "Payment was not created"}
      }else {
        return {success: true , message: "Payment created"}
      }
    })
  }
}
