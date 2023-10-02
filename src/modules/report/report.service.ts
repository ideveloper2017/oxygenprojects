import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { Between, getManager, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status';
import {Payments} from "../payments/entities/payment.entity";
import {Caishertype} from "../../common/enums/caishertype";

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
    const startDate = new Date(); // Set the desired start date
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(); // Set the desired end date
    endDate.setHours(23, 59, 59, 999);

    const result = await Orders.find({
      where: {
        order_status: OrderStatus.ACTIVE,
        is_deleted: false,
        order_date: Between(startDate, endDate),
      },
      relations: ['orderItems.apartments'],
    });
    return result;
  }

  async allPayment(){
    let res;
    // ['towns.name','caishers.caisher_name','payments.payment_date']
    res = await this.orderRepo.manager.getRepository(Payments)
        .createQueryBuilder('payments')
        .leftJoin('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
        // .leftJoin('payments.orders', 'orders', 'orders.id=payments.order_id')
        // .leftJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
        // .leftJoin('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
        // .leftJoin('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
        // .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
        // .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
        // .leftJoin('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
     //   .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')
     //   .select('towns.name')
        //.select('caishers.caisher_name')
       // .select('payments.paymentmethods')
        .select('SUM(payments.amount)','total_sum')
        .addSelect('SUM(payments.amount_usd)','total_usd')
        .where('payments.caisher_type=:cash',{cash:Caishertype.IN})
       .groupBy('payments.paymentmethods')
        //.addGroupBy('towns.id')
        //.addGroupBy('caishers.id')
      //  .addGroupBy("payments.paymentmethods")
     //   .addGroupBy('payments.payment_date')
       // .orderBy('payments.payment_date',"DESC")
        .getRawMany()


    return res;
  }
}
