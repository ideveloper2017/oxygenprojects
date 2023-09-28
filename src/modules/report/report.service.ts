import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { getManager, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Orders)
    private readonly orderRepo: Repository<Orders>,
    private readonly orderService: OrdersService,
  ) {}

  public async getListOfDebitors() {
    const usersWithTransactionSum = await this.orderRepo
      .createQueryBuilder('orders')
      .getRawMany();

    return usersWithTransactionSum;
  }

  public async getListByApartment() {
    const result = await Orders.find({
      where: { order_status: OrderStatus.INACTIVE, is_deleted: false },
      relations: ['orderItems'],
    });
    return result;
  }
}
