import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import {
  Between,
  getManager,
  getRepository,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status';
import { Payments } from '../payments/entities/payment.entity';
import { Caishertype } from '../../common/enums/caishertype';
import { OrderItems } from '../order-items/entities/order-item.entity';
import * as moment from 'moment/moment';
import { groupBy } from 'rxjs';
import { ApartmentStatus } from '../../common/enums/apartment-status';
import { response } from 'express';

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
    let resultRes;
    const startDate = new Date(); // Set the desired start date
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(); // Set the desired end date
    endDate.setHours(23, 59, 59, 999);

    const result = await await this.orderRepo.manager
      .createQueryBuilder(Orders, 'orders')
      .leftJoin(
        'orders.orderItems',
        'orderitems',
        'orderitems.order_id=orders.id',
      )
      .leftJoin(
        'orderitems.apartments',
        'apartments',
        'apartments.id=orderitems.apartment_id',
      )
      .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
      .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
      .leftJoin(
        'entrance.buildings',
        'buildings',
        'buildings.id=entrance.building_id',
      )
      .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')
      .select('towns.name')
      .addSelect('buildings.name')
      // .addSelect('entrance.entrance_number')
      .addSelect('floor.floor_number')
      .addSelect('SUM(apartments.room_space) as all_room_space')
      // .addSelect('apartments.cells')
      .where('orders.order_status= :status', { status: OrderStatus.ACTIVE })
      .andWhere('orders.is_deleted= :delete', { delete: false })
      .andWhere(
        'orders.order_date>= :startDate and orders.order_date<= :endDate',
        { startDate: startDate, endDate: endDate },
      )
      .andWhere('apartments.status=:aprstatus', {
        aprstatus: ApartmentStatus.SOLD,
      })
      .groupBy('towns.id')
      .addGroupBy('buildings.id')
      // .addGroupBy('entrance.id')
      .addGroupBy('floor.id')
      // .addGroupBy('apartments.id')
      .orderBy('floor.id', 'ASC')
      .getRawMany();

    // resultRes = await Promise.all(
    //   result.map(async (data) => {
    //     data['town'] = data.towns_name;
    //     data['building'] = data.buildings_name;
    //     data['floor'] = data.floor_number;
    //   }),
    // );
    // where: {
    //   order_status: OrderStatus.ACTIVE,
    //   is_deleted: false,
    //   order_date: Between(startDate, endDate),
    // },
    // relations: ['orderItems.apartments'],
    // });
    return result;
  }

  async allPayment(dayType: string, from: string, to: string) {
    let res;
    let updatedRes;

    // if (dayType=='day') {

    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // const tomorrow = new Date(today);
    // tomorrow.setDate(tomorrow.getDate() + 1);
    // from?from:today;
    // to?to:to
    // const dateObjectFrom: moment.Moment = moment(from);
    // const startDate = new Date(from);
    // const dateObjectTo: moment.Moment = moment(to);
    //  const endDate = new Date(to);

    const startDate = new Date(from);
    // if (dayType == 'day') {
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setDate(endDate.getDate());

    console.log(`${startDate}` + ' ' + `${endDate}`);
    res = await this.orderRepo.manager
      .createQueryBuilder(Payments, 'payments')
      .leftJoin(
        'payments.caishers',
        'caishers',
        'caishers.id=payments.caisher_id',
      )
      .leftJoin('payments.orders', 'orders', 'orders.id=payments.order_id')
      .leftJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
      .leftJoin(
        'orders.orderItems',
        'orderitems',
        'orderitems.order_id=orders.id',
      )
      .leftJoin(
        'orderitems.apartments',
        'apartments',
        'apartments.id=orderitems.apartment_id',
      )
      .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
      .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
      .leftJoin(
        'entrance.buildings',
        'buildings',
        'buildings.id=entrance.building_id',
      )
      .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')
      .select('towns.name')
      .addSelect('towns.id')
      .addSelect('caishers.id')
      .addSelect('payments.paymentmethods')
      .addSelect('caishers.caisher_name')
      .addSelect('SUM(payments.amount)', 'total_sum')
      .addSelect('SUM(payments.amount_usd)', 'total_usd')
      .where('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .andWhere('payments.payment_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })

      .groupBy('payments.payment_date')
      .addGroupBy('payments.paymentmethods')
      .addGroupBy('towns.id')
      .addGroupBy('caishers.id')
      .addGroupBy('payments.paymentmethods')
      .getRawMany();

    updatedRes = await Promise.all(
      res.map(async (data) => {
        let summa_out;
        summa_out = await this.payment_sum_in(
          data.towns_id,
          data.payments_paymentmethods,
          data.caishers_id,
          dayType,
        ).then((response) => {
          return response;
        });
        data['total_sum_out'] = Number(summa_out.total_sum_out);
        data['total_sum_out_usd'] = Number(summa_out.total_usd_out);
        data['grand_total_sum'] = Number(
          data.total_sum - summa_out.total_sum_out,
        );
        data['grand_total_usd'] = Number(
          data.total_usd - summa_out.total_usd_out,
        );
        return data;
      }),
    );
    // } else if (dayType=='month')  {
    //     const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    //     res = await this.orderRepo.manager.createQueryBuilder(Payments, 'payments')
    //         .leftJoin('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
    //         .leftJoin('payments.orders', 'orders', 'orders.id=payments.order_id')
    //         .leftJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
    //         .leftJoin('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
    //         .leftJoin('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
    //         .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
    //         .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
    //         .leftJoin('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
    //         .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')
    //         .select('TO_CHAR(payments.payment_date, \'YYYY-MONTH\') as month')
    //         .addSelect('towns.name')
    //         .addSelect('towns.id')
    //         .addSelect('caishers.id')
    //         .addSelect('payments.paymentmethods')
    //         .addSelect('caishers.caisher_name')
    //         .addSelect('SUM(payments.amount)', 'total_sum')
    //         .addSelect('SUM(payments.amount_usd)', 'total_usd')
    //         .where('payments.caisher_type= :cash', {cash: Caishertype.IN})
    //         .andWhere('payments.payment_date>= :startDate', { startDate: startOfMonth })
    //         .groupBy('payments.payment_date')
    //         .addGroupBy('payments.paymentmethods')
    //         .addGroupBy('towns.id')
    //         .addGroupBy('caishers.id')
    //         .addGroupBy("payments.paymentmethods")
    //         .orderBy('payments.payment_date',"DESC")
    //         .getRawMany()
    //     updatedRes = await Promise.all(res.map(async (data) => {
    //         let summa_out;
    //         summa_out = await this.payment_sum_in(data.towns_id, data.payments_paymentmethods, data.caishers_id,dayType)
    //             .then((response) => {
    //                 return response;
    //             });
    //         data['total_sum_out'] = Number(summa_out.total_sum_out);
    //         data['total_sum_out_usd'] = Number(summa_out.total_usd_out);
    //         data['grand_total_sum'] = Number(data.total_sum - summa_out.total_sum_out)
    //         data['grand_total_usd'] = Number(data.total_usd - summa_out.total_usd_out)
    //         return data;
    //     }));
    // } else if (dayType=='year')  {
    //      const startOfYear = new Date(today.getFullYear(), 0, 1);
    //     res = await this.orderRepo.manager.createQueryBuilder(Payments, 'payments')
    //         .leftJoin('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
    //         .leftJoin('payments.orders', 'orders', 'orders.id=payments.order_id')
    //         .leftJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
    //         .leftJoin('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
    //         .leftJoin('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
    //         .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
    //         .leftJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
    //         .leftJoin('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
    //         .leftJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')
    //         .select('DATE_TRUNC(\'year\', payments.payment_date) as year')
    //         .addSelect('towns.name')
    //         .addSelect('towns.id')
    //         .addSelect('caishers.id')
    //         .addSelect('payments.paymentmethods')
    //         .addSelect('caishers.caisher_name')
    //         .addSelect('SUM(payments.amount)', 'total_sum')
    //         .addSelect('SUM(payments.amount_usd)', 'total_usd')
    //         .where('payments.caisher_type= :cash', {cash: Caishertype.IN})
    //         .andWhere('payments.payment_date>= :startDate', { startDate: startOfYear })
    //         .groupBy('DATE_TRUNC(\'year\', payments.payment_date)')
    //         .addGroupBy('payments.payment_date')
    //         .addGroupBy('payments.paymentmethods')
    //         .addGroupBy('towns.id')
    //         .addGroupBy('caishers.id')
    //         .addGroupBy("payments.paymentmethods")
    //         .orderBy('payments.payment_date',"DESC")
    //         .getRawMany()
    //
    //
    //     updatedRes = await Promise.all(res.map(async (data) => {
    //         let summa_out;
    //         summa_out = await this.payment_sum_in(data.towns_id, data.payments_paymentmethods, data.caishers_id,dayType)
    //             .then((response) => {
    //                 return response;
    //             });
    //         data['total_sum_out'] = Number(summa_out.total_sum_out);
    //         data['total_sum_out_usd'] = Number(summa_out.total_usd_out);
    //         data['grand_total_sum'] = Number(data.total_sum - summa_out.total_sum_out)
    //         data['grand_total_usd'] = Number(data.total_usd - summa_out.total_usd_out)
    //         return data;
    //     }));
    // }

    return updatedRes;
  }

  async payment_sum_in(
    town_id: number,
    paymentmethods: string,
    caisher_id: number,
    dayType: string,
  ) {
    const sumResults = {
      total_sum_out: 0,
      total_usd_out: 0,
    };
    let result;
    const today = new Date();
    // if (dayType == 'day') {
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result = await this.orderRepo.manager
      .createQueryBuilder(Payments, 'payments')
      .leftJoinAndSelect(
        'payments.caishers',
        'caishers',
        'caishers.id=payments.caisher_id',
      )
      .leftJoinAndSelect(
        'payments.orders',
        'orders',
        'orders.id=payments.order_id',
      )
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id=orders.client_id',
      )
      .leftJoinAndSelect(
        'orders.orderItems',
        'orderitems',
        'orderitems.order_id=orders.id',
      )
      .leftJoinAndSelect(
        'orderitems.apartments',
        'apartments',
        'apartments.id=orderitems.apartment_id',
      )
      .leftJoinAndSelect(
        'apartments.floor',
        'floor',
        'floor.id=apartments.floor_id',
      )
      .leftJoinAndSelect(
        'floor.entrance',
        'entrance',
        'entrance.id=floor.entrance_id',
      )
      .leftJoinAndSelect(
        'entrance.buildings',
        'buildings',
        'buildings.id=entrance.building_id',
      )
      .leftJoinAndSelect(
        'buildings.towns',
        'towns',
        'towns.id=buildings.town_id',
      )
      .select([
        'towns.name',
        'payments.paymentmethods',
        'caishers.caisher_name',
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])

      .where('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('towns.id= :town_id', { town_id: town_id })
      .andWhere('caishers.id= :caisher_id', { caisher_id: caisher_id })
      .andWhere('payments.paymentmethods= :paymentmethods', {
        paymentmethods: paymentmethods,
      })
      .andWhere(
        'payments.payment_date>= :startDate AND payments.payment_date<= :endDate',
        { startDate: today, endDate: tomorrow },
      )
      .groupBy('payments.paymentmethods')
      .addGroupBy('towns.id')
      .addGroupBy('caishers.id')
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum_out = item.total_sum;
      sumResults.total_usd_out = item.total_usd;
    });

    return sumResults;
  }

  async allCaisher() {
    let res;
    let updatedRes;

    res = await this.orderRepo.manager
      .createQueryBuilder(Payments, 'payments')
      .leftJoin(
        'payments.caishers',
        'caishers',
        'caishers.id=payments.caisher_id',
      )
      .select('caishers.caisher_name')
      .addSelect('caishers.id')
      .addSelect('payments.paymentmethods')
      .addSelect('SUM(payments.amount)', 'total_sum')
      .addSelect('SUM(payments.amount_usd)', 'total_usd')
      .where('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .groupBy('caishers.id')
      .addGroupBy('payments.paymentmethods')
      .getRawMany();

    updatedRes = await Promise.all(
      res.map(async (data) => {
        let summa_out;
        summa_out = await this.allCaisher_Out(
          data.payments_paymentmethods,
          data.caishers_id,
        ).then((response) => {
          return response;
        });
        data['total_sum_out'] = Number(summa_out.total_sum_out);
        data['total_sum_out_usd'] = Number(summa_out.total_usd_out);
        data['grand_total_sum'] = Number(
          data.total_sum - summa_out.total_sum_out,
        );
        data['grand_total_usd'] = Number(
          data.total_usd - summa_out.total_usd_out,
        );
        return data;
      }),
    );

    return updatedRes;
  }

  async allCaisher_Out(paymentmethods: string, caisher_id: number) {
    const sumResults = {
      total_sum_out: 0,
      total_usd_out: 0,
    };
    let result;

    result = await this.orderRepo.manager
      .createQueryBuilder(Payments, 'payments')
      .leftJoinAndSelect(
        'payments.caishers',
        'caishers',
        'caishers.id=payments.caisher_id',
      )
      .select([
        'caishers.caisher_name',
        'payments.paymentmethods',
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])

      .where('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('caishers.id= :caisher_id', { caisher_id: caisher_id })
      .andWhere('payments.paymentmethods= :paymentmethods', {
        paymentmethods: paymentmethods,
      })
      .groupBy('caishers.id')
      .addGroupBy('payments.paymentmethods')
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum_out = item.total_sum;
      sumResults.total_usd_out = item.total_usd;
    });
    return sumResults;
  }

  public async getClientByApartment() {
    let res;
    let updatedRes;
    res = await this.orderRepo.manager
      .createQueryBuilder(Orders, 'orders')
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id=orders.client_id',
      )
      .leftJoinAndSelect(
        'orders.orderItems',
        'orderitems',
        'orderitems.order_id=orders.id',
      )
      .leftJoinAndSelect(
        'orderitems.apartments',
        'apartments',
        'apartments.id=orderitems.apartment_id',
      )
      .leftJoinAndSelect(
        'apartments.floor',
        'floor',
        'floor.id=apartments.floor_id',
      )
      .leftJoinAndSelect(
        'floor.entrance',
        'entrance',
        'entrance.id=floor.entrance_id',
      )
      .leftJoinAndSelect(
        'entrance.buildings',
        'buildings',
        'buildings.id=entrance.building_id',
      )
      .leftJoinAndSelect(
        'buildings.towns',
        'towns',
        'towns.id=buildings.town_id',
      )
      .select([
        'orders.id as order_id',
        'clients.id',
        'clients.first_name',
        'clients.last_name',
        'clients.middle_name',
        'orders.total_amount',
        'orders.total_amount_usd',
        'apartments.cells',
        'apartments.room_number',
        'apartments.room_space',
        'buildings.mk_price',
      ])
      .where('orders.order_status= :orderStatus', {
        orderStatus: OrderStatus.ACTIVE,
      })
      .andWhere('orders.is_deleted= :isDelete', { isDelete: false })
      .getRawMany();

    updatedRes = await Promise.all(
      res.forEach(async (data) => {
        let summa_out;
        summa_out = await this.clientPayment(data.order_id).then((response) => {
          return response;
        });
        data['total_sum_out'] = Number(summa_out.total_sum_out);
        data['total_sum_out_usd'] = Number(summa_out.total_usd_out);
        data['grand_total_sum'] = Number(data.total_sum - summa_out.total_sum_out);
        data['grand_total_usd'] = Number(data.total_usd - summa_out.total_usd_out);
        return data;
      }),
    );

    return updatedRes;
  }

  async clientPayment(order_id: number) {
    const sumResults = {
      total_sum_out: 0,
      total_usd_out: 0,
    };
    let result;

    result = await this.orderRepo.manager
      .createQueryBuilder(Payments, 'payments')
      .select([
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])
      .where('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .where('payments.order_id= :order_id', { order_id })
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum_out = item.total_sum;
      sumResults.total_usd_out = item.total_usd;
    });
    return sumResults;
  }
}
