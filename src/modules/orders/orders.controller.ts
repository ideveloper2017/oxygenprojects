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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Users } from '../users/entities/user.entity';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  //@Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Order qo'shishi" })
  @Post('/add')
  createOrder(
    @AuthUser() user_id: any,
    @Body() createOrderDto: CreateOrderDto,
    @Res() res: Response,
  ) {
    return this.orderService
      .createOrder(createOrderDto, user_id)
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

  @UseGuards(JwtAuthGuard)
  //@Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Order/Orderlar ro'yxatini ko'rish" })
  @Get('/order-list/:id')
  getOrder(@AuthUser() user_id: any, @Param('id') id?: number) {
    return this.orderService
      .getActiveOrdersList(id, user_id)
      .then((response) => {
        if (response !== null && response.length != 0) {
          return { data: response, message: 'Fetched data' };
        } else {
          return { success: true, message: 'Not found!' };
        }
      })
      .catch((error) => {
        return { status: error.code, message: error.message };
      });
  }

  @ApiOperation({ summary: "Apartment/Orderlar ro'yxatini ko'rish" })
  @Get('/orderlistapartment/:apartment_id')
  getOrderByAparmentID(@Param('apartment_id') id?: number) {
    return this.orderService.findOrderByApartmentID(id).then((response) => {
      if (response) {
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
      return { succes: false, message: 'IDs not given' };
    }
    return this.orderService.deleteOrder(arrayOfId).then((response) => {
      if (response == arrayOfId.length) {
        return {
          success: true,
          message: `Orders deleted successfully`,
        };
      } else if (response < arrayOfId.length) {
        return { success: true, message: 'order deleted ' };
      } else {
        return { success: false, message: 'order not found ' };
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

  @ApiOperation({summary: "Shartnoma bekor qilish"})
  @Post('/cancel')
  cancelOrders(@Body() arraOfId: number[]) {
    if(arraOfId.length){
      return this.orderService.orderReject(arraOfId);
    } else {
      return { success: false, message: 'IDs not provided' };
    }
  }
  
  @ApiOperation({summary: "Qarzi bor shartnomalarni olish"})
  @Get('/listdue')
  getOrderListDue() {
    return this.orderService.getOrderListIsDue();
  }

  @ApiOperation({summary: "Get Canceled orders"})
  @Get('/canceled-orders/:orderId')
  getCanceledOrders(@Param('orderId') orderId: number) {
    return this.orderService.findRejectedOrders(orderId);
  }

  @ApiOperation({summary: "Get Completed orders"})
  @Get('/done-orders/:orderId')
  getCompletedOrders(@Param('orderId') orderId: number) {
    return this.orderService.findCompletedOrders(orderId);
  }

  @ApiOperation({summary: "Haqi bor shartnomalarni olish"})
  @Get('/refunding-orders')
  getLeftAmountsOfReturningOrders() {
    return this.orderService.findLeftAmountsOfReturningOrders();
  }
}
