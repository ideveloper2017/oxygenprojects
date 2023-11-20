import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status';
import { Payments } from '../payments/entities/payment.entity';
import { Caishertype } from '../../common/enums/caishertype';
import { ApartmentStatus } from '../../common/enums/apartment-status';
import { Paymentmethods } from '../../common/enums/paymentmethod';
import { Apartments } from '../apartments/entities/apartment.entity';
import { Clients } from '../clients/entities/client.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';

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
      .addSelect(
        'cast(SUM(apartments.room_space) as numeric) as all_room_space',
      )
      // .addSelect('apartments.cells')
      .where('orders.order_status= :status', { status: OrderStatus.ACTIVE })
      .andWhere('orders.is_deleted= :delete', { delete: false })
      // .andWhere(
      //   'orders.order_date>= :startDate and orders.order_date<= :endDate',
      //   { startDate: startDate, endDate: endDate },
      // )
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

    const startDate =
      String(new Date(from).getFullYear()) +
      '-' +
      String(new Date(from).getMonth() + 1).padStart(2, '0') +
      '-' +
      String(new Date(from).getDate()).padStart(2, '0');
    const endDate =
      String(new Date(to).getFullYear()) +
      '-' +
      String(new Date(to).getMonth() + 1).padStart(2, '0') +
      '-' +
      String(new Date(to).getDate()).padStart(2, '0');
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
      .select("TO_CHAR(payments.payment_date,'DD.MM.YYYY') as payment_date")
      .addSelect('towns.name')
      .addSelect('towns.id')
      .addSelect('caishers.id')
      .addSelect('payments.paymentmethods')
      .addSelect('caishers.caisher_name')
      .addSelect('SUM(payments.amount)', 'total_sum')
      .addSelect('SUM(payments.amount_usd)', 'total_usd')
      .where('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .andWhere(
        "TO_CHAR(payments.payment_date,'YYYY-MM-DD') BETWEEN :startDate AND :endDate",
        {
          startDate,
          endDate,
        },
      )

      .groupBy('payments.payment_date')
      .addGroupBy('caishers.id')
      .addGroupBy('towns.id')

      .addGroupBy('payments.paymentmethods')
      .getRawMany();
    console.log(startDate + ' ' + endDate);
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

  async allCaisher(from: string, to: string) {
    let res;
    let updatedRes;
    const startDate =
      String(new Date(from).getFullYear()) +
      '-' +
      String(new Date(from).getMonth() + 1).padStart(2, '0') +
      '-' +
      String(new Date(from).getDate()).padStart(2, '0');
    const endDate =
      String(new Date(to).getFullYear()) +
      '-' +
      String(new Date(to).getMonth() + 1).padStart(2, '0') +
      '-' +
      String(new Date(to).getDate()).padStart(2, '0');

    res = await this.orderRepo.manager
      .createQueryBuilder(Payments, 'payments')
      .leftJoinAndSelect(
        'payments.caishers',
        'caishers',
        'caishers.id=payments.caisher_id',
      )
      .leftJoinAndSelect('payments.users', 'users', 'users.id=payments.user_id')
      .select('users.*')
      .addSelect('caishers.caisher_name')
      .addSelect('caishers.id')
      .addSelect('SUM(payments.amount)', 'total_sum')
      .addSelect('SUM(payments.amount_usd)', 'total_usd')
      .where('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .andWhere(
        "TO_CHAR(payments.payment_date,'YYYY-MM-DD') BETWEEN :startDate AND :endDate",
        {
          startDate,
          endDate,
        },
      )
      .groupBy('users.id')
      .addGroupBy('caishers.id')
      .getRawMany();

    updatedRes = await Promise.all(
      res.map(async (data) => {
        let summa_out;
        summa_out = await this.allCaisher_Out(
          data.payments_paymentmethods,
          data.caishers_id,
          startDate,
          endDate,
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

  async allCaisher_Out(
    paymentmethods: string,
    caisher_id: number,
    from: string,
    to: string,
  ) {
    const sumResults = {
      total_sum_out: 0,
      total_usd_out: 0,
    };
    let result;
    const startDate =
      String(new Date(from).getFullYear()) +
      '-' +
      String(new Date(from).getMonth() + 1).padStart(2, '0') +
      '-' +
      String(new Date(from).getDate()).padStart(2, '0');
    const endDate =
      String(new Date(to).getFullYear()) +
      '-' +
      String(new Date(to).getMonth() + 1).padStart(2, '0') +
      '-' +
      String(new Date(to).getDate()).padStart(2, '0');

    result = await this.orderRepo.manager
      .createQueryBuilder(Payments, 'payments')
      .leftJoinAndSelect(
        'payments.caishers',
        'caishers',
        'caishers.id=payments.caisher_id',
      )
      .leftJoinAndSelect('payments.users', 'users', 'users.id=payments.user_id')
      .select([
        'users.*',
        'caishers.caisher_name',
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])

      .where('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('caishers.id= :caisher_id', { caisher_id: caisher_id })
      .andWhere('payments.paymentmethods= :paymentmethods', {
        paymentmethods: paymentmethods,
      })
      .andWhere(
        "TO_CHAR(payments.payment_date,'YYYY-MM-DD') BETWEEN :startDate AND :endDate",
        {
          startDate,
          endDate,
        },
      )
      .groupBy('users.id')
      .addGroupBy('caishers.id')
      // .addGroupBy('payments.paymentmethods')
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
        'orders.total_amount as total_amount',
        'orders.total_amount_usd as total_amount_usd',
        'towns.name as townname',
        'buildings.name as buildingname',
        'entrance.entrance_number',
        'floor.floor_number',
        'apartments.cells',
        'apartments.room_number',
        'apartments.room_space',
        'buildings.mk_price',
      ])
      .where('orders.order_status IN(:...orderStatus)', {
        orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      })
      .andWhere('orders.is_deleted= :isDelete', { isDelete: false })
      .getRawMany();

    updatedRes = await Promise.all(
      res.map(async (data) => {
        let summa_out;
        summa_out = await this.clientPayment(data.order_id).then((response) => {
          return response;
        });
        data['total_sum_out'] = Number(summa_out.total_sum_out);
        data['total_sum_out_usd'] = Number(summa_out.total_usd_out);
        data['due_total_sum'] = Number(
          data.total_amount - summa_out.total_sum_out,
        );
        data['due_total_usd'] = Number(
          data.total_amount_usd - summa_out.total_usd_out,
        );
        console.log(data);
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

  async summaryReport() {
    let result, res;
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
      .leftJoinAndSelect(
        'orders.payments',
        'payments',
        'orders.id=payments.order_id',
      )
      .select([
        'buildings.id as build_id',
        'towns.name as townname',
        'buildings.name as buildingname',
        'SUM(orders.total_amount) as total_amount',
      ])
      .where('orders.order_status IN(:...orderStatus)', {
        orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      })
      .andWhere('payments.caisher_type=:caisher_type', {
        caisher_type: Caishertype.IN,
      })
      .andWhere('orders.is_deleted= :isDelete', { isDelete: false })
      .groupBy('towns.id')
      .addGroupBy('buildings.id')
      .getRawMany();

    result = await Promise.all(
      res.map(async (data) => {
        let summa, summabank;
        summa = await this.allSummaryPayment(
          data.build_id,
          Paymentmethods.CASH,
        ).then((data) => {
          return data;
        });
        summabank = await this.allSummaryPayment(
          data.build_id,
          Paymentmethods.BANK,
        ).then((data) => {
          return data;
        });
        data['total_sum_cash'] = Number(summa.total_sum);
        data['total_sum_bank'] = Number(summabank.total_sum);
        data['total_sum_due'] =
          Number(data.total_amount) -
          (Number(summabank.total_sum) + Number(summa.total_sum));
        return data;
      }),
    );

    return result;
  }

  async allSummaryPayment(build_id: number, paymentMethod: Paymentmethods) {
    const sumResults = {
      total_sum: 0,
      total_usd: 0,
    };
    let result;

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
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])

      .where('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .andWhere('buildings.id= :id', { id: build_id })
      .andWhere('payments.paymentmethods=:paymethod', {
        paymethod: paymentMethod,
      })
      // .andWhere('caishers.id= :caisher_id', { caisher_id: caisher_id })
      // .andWhere(
      //     "TO_CHAR(payments.payment_date,'YYYY-MM-DD') BETWEEN :startDate AND :endDate",
      //     {
      //       startDate,
      //       endDate,
      //     },
      // )
      // .addGroupBy('caishers.id')
      // .addGroupBy('payments.paymentmethods')
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum = item.total_sum;
      sumResults.total_usd = item.total_usd;
    });
    return sumResults;
  }

  async returnReport() {
    let result, res;
    const clients = [];
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
      .leftJoinAndSelect(
        'orders.payments',
        'payments',
        'orders.id=payments.order_id',
      )
      .select(['buildings.id as build_id', 'buildings.name as buildingname'])
      .where('orders.order_status IN(:...orderStatus)', {
        orderStatus: [OrderStatus.INACTIVE],
      })
      .andWhere('payments.caisher_type=:caisher_type', {
        caisher_type: Caishertype.OUT,
      })
      .andWhere('orders.is_deleted= :isDelete', { isDelete: false })
      // .groupBy('towns.id')
      // .addGroupBy('buildings.id')
      .getRawMany();

    result = await Promise.all(
      res.map(async (data) => {
        data['apartment'] = await this.getApartment(data.build_id);
        return data;
      }),
    );

    return result;
  }

  async getApartment(building_id: number) {
    let result, res;
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
        'apartments.room_number',
        'clients.id as client_id',
        'clients.first_name',
        'clients.last_name',
        'clients.middle_name',
        'clients.contact_number',
      ])
      .where('buildings.id= :building_id', { building_id: building_id })
      .getRawMany();
    result = await Promise.all(
      res.map(async (data) => {
        data['payments'] = await this.returnPayment(data.client_id);
        return data;
      }),
    );

    return result;
  }

  async returnPayment(client_id: number) {
    let result: any;
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
      .select([
        "to_char(payments.payment_date,'MM-YYYY') as payment_date",
        'SUM(payments.amount) as amount',
        'SUM(payments.amount_usd) as amount_usd',
      ])
      .where('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('clients.id= :client_id', { client_id: client_id })
      .groupBy("to_char(payments.payment_date,'MM-YYYY')")
      .getRawMany();
    return result;
  }

  async dueListReport() {
    let result, res;
    const clients = [];
    res = await this.orderRepo.manager
      .createQueryBuilder(Orders, 'orders')
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id=orders.client_id',
      )
      .leftJoinAndSelect('orders.users', 'users', 'users.id=orders.user_id')
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
      .leftJoinAndSelect(
        'orders.payments',
        'payments',
        'orders.id=payments.order_id',
      )
      .leftJoinAndSelect(
        'orders.paymentMethods',
        'paymentMethods',
        'paymentMethods.id=orders.payment_method_id',
      )
      .select([
        'orders.id as order_id',
        "to_char(orders.order_date,'DD.MM.YYYY') as order_date",
        'users.first_name as ufrist_name',
        'users.last_name as ulast_name',
        'clients.first_name as cfirst_name',
        'clients.last_name as flast_name',
        'clients.middle_name as fmiddle_name',
        'clients.contact_number as phone',
        'paymentMethods.name as paymethod',
        'orders.total_amount as total_amount',
      ])
      .where('orders.order_status IN(:...orderStatus)', {
        orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      })
      .andWhere('payments.caisher_type=:caisher_type', {
        caisher_type: Caishertype.IN,
      })
      .andWhere('orders.is_deleted= :isDelete', { isDelete: false })
      // .groupBy('towns.id')
      // .addGroupBy('buildings.id')
      .getRawMany();

    result = await Promise.all(
      res.map(async (data) => {
        let payment, credit_table;
        payment = await this.clientPayment(data.order_id);
        credit_table = await this.getCreditTable(data.order_id);
        data['payment'] = payment;
        data['payment_months'] = await this.getCreditTable(data.order_id);
        data['summary_due'] =(data.total_amount)-Number(payment.total_sum_out);
        return data;
      }),
    );

    return result;
  }

  public async getCreditTable(order_id: number) {
    let result;
    result = this.orderRepo.manager
      .createQueryBuilder(CreditTable, 'credittable')
      .select([
        "to_char(credittable.due_date,'DD-MM-YYYY') as due_date",
        'credittable.due_amount as due_amount',
      ])
      .where('credittable.order_id= :order_id', { order_id: order_id })
      .getRawMany();
    return result;
  }
}
