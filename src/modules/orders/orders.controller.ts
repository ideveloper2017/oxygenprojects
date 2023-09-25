import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrdersService) {}

  @ApiOperation({ summary: "Order qo'shishi" })
  @Post('/add')
  createOrder(@Body() createOrderDto: CreateOrderDto, @Res() res: Response) {
    return this.orderService
      .createOrder(createOrderDto)
      .then((response) => {
        if (response.affected) {
          res.send({
            success: true,
            data: response,
            message: 'Order created successfully',
          });
        } else {
          res.send({
            success: false,
            data: response,
            message: 'No order created successfully',
          });
        }
      })
      .catch((error) => {
        res.send({ status: 409, success: false, message: error.message });
      });
  }

  @ApiOperation({ summary: "Order/Orderlar ro'yxatini ko'rish" })
  @Get('/order-list/:id')
  getOrder(@Param('id') id?: number) {
    return this.orderService.getOrderList(id).then((response) => {
      if (response !== null && response.length != 0) {
        return { data: response, message: 'Fetched data' };
      } else {
        return { success: true, message: 'Not found!' };
      }
    });
  }

  @ApiOperation({ summary: "Order/Orderlar ro'yxatini ko'rish" })
  @Get('/orderlistapartment/:apartment_id')
  getOrderByAparment(@Param('apartment_id') id?: number) {
    return this.orderService.getAppartmenOrderList(id).then((response) => {
      if (response !== null && response.length != 0) {
        return { data: response, message: 'Fetched data' };
      } else {
        return { success: true, message: 'Not found!' };
      }
    });
  }

  @ApiOperation({ summary: 'Order ni tahrirlash' })
  @Patch('/edit/:id')
  editOrder(@Param('id') id: number, @Body() editOrderDto: UpdateOrderDto) {
    return this.orderService.updateOrder(id, editOrderDto).then((response) => {
      if (response.affected != 0) {
        return { success: true, message: 'order updated' };
      } else {
        return { success: false, message: 'order not found' };
      }
    });
  }

  @ApiOperation({
    summary: "Order ni o'chirish IDlar ni array ichida berish kerak",
  })
  @Post('/delete')
  deleteOrder(@Body() arrayOfId: number[]) {
    if (arrayOfId.length == 0) {
      throw new HttpException('provide order ids', HttpStatus.LENGTH_REQUIRED);
    }
    return this.orderService.deleteOrder(arrayOfId).then((response) => {
      if (response.affected != 0) {
        return {
          success: true,
          message: `Orders deleted successfully`,
        };
      } else {
        return { success: false, message: 'order not exists' };
      }
    });
  }

  @Get('/last')
  getLastID() {
    return this.orderService.getLastID().then((data) => {
      if (data != null) {
        return { success: true, data: data.id + 1 };
      } else {
        return { success: true, data: 1 };
      }
    });
  }

  @Post('/orderreject')
  orderreject(@Param('order_id') order_id: number) {
    return this.orderService.orderReject(order_id);
  }

  @Get('/listdue')
  getOrderListDue() {
    return this.orderService.getOrderListIsDue();
  }
}
