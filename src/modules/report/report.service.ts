import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import {Between, getManager, getRepository, Repository, SelectQueryBuilder} from 'typeorm';
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
    let subqueryOut:SelectQueryBuilder<Payments>;
    const paymentRepo=await this.orderRepo.manager.getRepository(Payments);
     subqueryOut=paymentRepo.createQueryBuilder();
        subqueryOut
            .subQuery()
            .select('SUM(payout.amount)','total_sum')
            .from(Payments,'payout')

            .where('payout.caisher_type In(:...cash)',{cash:[Caishertype.OUT]})
            .where('payout.id=payments.id')
        ;

    // ['towns.name','caishers.caisher_name','payments.payment_date']
    res = await this.orderRepo.manager.createQueryBuilder(Payments,'payments')
        .leftJoin('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
        .leftJoin('payments.orders', 'orders', 'orders.id=payments.order_id')
        .leftJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
        .leftJoin('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
        .leftJoin('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
        .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
        .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
        .leftJoin('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
       .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')

        .select('towns.name')
        .addSelect('towns.id')
        .addSelect('caishers.id')
        .addSelect('payments.paymentmethods')
        .addSelect('caishers.caisher_name')
        .addSelect('SUM(payments.amount)','total_sum')
        .addSelect('SUM(payments.amount_usd)','total_usd')

        .where('payments.caisher_type IN(:...cash)',{cash:[Caishertype.IN]})
        .groupBy('payments.paymentmethods')
        .addGroupBy('towns.id')
        .addGroupBy('caishers.id')
       .addGroupBy("payments.paymentmethods")
       .getRawMany()

    // payments_paymentmethods: 'card',
    //     caishers_id: null,
    //     caishers_caisher_name: null,
    //     towns_id: 1,
    //     towns_name: 'Oxygen',
    //     total_sum_p: '468377771.00',
    //     total_usd: '38391.62'

    res.forEach((data)=>{

      const sum=  this.payment_sum_in(data.towns_id,data.payments_paymentmethods,data.caishers_id);

      data.summa=sum
    })
    return res;
  }

  public async payment_sum_in(town_id:number,paymentmethods:string,caisher_id:number){
    let res;
     res=  await this.orderRepo.manager.createQueryBuilder(Payments,'payments')
        .leftJoin('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
        .leftJoin('payments.orders', 'orders', 'orders.id=payments.order_id')
        .leftJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
        .leftJoin('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
        .leftJoin('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
        .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
        .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
        .leftJoin('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
        .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')

        .select('towns.name')
        .addSelect('payments.paymentmethods')
        .addSelect('caishers.caisher_name')
        .addSelect('SUM(payments.amount)','total_sum')
        .addSelect('SUM(payments.amount_usd)','total_usd')

        .where('payments.caisher_type IN(:...cash)',{cash:[Caishertype.OUT]})
        .where('town.id=:town_id',{town_id:town_id})
        .where('caishers.id=:caisher_id',{caisher_id:caisher_id})
        .where('payments.paymentmethods=:paymentmethods', {paymentmethods:paymentmethods})
        .groupBy('payments.paymentmethods')
        .addGroupBy('towns.id')
        .addGroupBy('caishers.id')
        .addGroupBy("payments.paymentmethods")
        .getRawOne();
    console.log(JSON.stringify(res));
    return res;
  }
}
