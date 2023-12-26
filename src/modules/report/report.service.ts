import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status';
import { Payments } from '../payments/entities/payment.entity';
import { Caishertype } from '../../common/enums/caishertype';
import { ApartmentStatus } from '../../common/enums/apartment-status';
import { Paymentmethods } from '../../common/enums/paymentmethod';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { Apartments } from '../apartments/entities/apartment.entity';
import { Buildings } from '../buildings/entities/building.entity';
import { Entrance } from '../entrance/entities/entrance.entity';
import { OrderItems } from '../order-items/entities/order-item.entity';

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
      .groupBy("TO_CHAR(payments.payment_date,'DD.MM.YYYY')")
      .addGroupBy('caishers.id')
      .addGroupBy('towns.id')
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
        data['total_sum_out'] = Math.round(Number(summa_out.total_sum_out));
        data['total_sum_out_usd'] = Math.round(Number(summa_out.total_usd_out));
        data['grand_total_sum'] =
          Math.round(Number(data.total_sum)) -
          Math.round(Number(summa_out.total_sum_out));
        data['grand_total_usd'] =
          Math.round(Number(data.total_usd)) -
          Math.round(Number(summa_out.total_usd_out));
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
      .addSelect('payments.paymentmethods as paymentmethods')
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
      .addGroupBy('payments.paymentmethods')
      .getRawMany();

    updatedRes = await Promise.all(
      res.map(async (data) => {
        let summa_out;
        summa_out = await this.allCaisher_Out(
          data.paymentmethods,
          data.caishers_id,
          startDate,
          endDate,
        ).then((response) => {
          return response;
        });
        data['total_sum_out'] = Number(summa_out.total_sum_out);
        data['total_sum_out_usd'] = Math.round(Number(summa_out.total_usd_out));
        data['grand_total_sum'] =
          Number(data.total_sum) - Number(summa_out.total_sum_out);
        data['grand_total_usd'] =
          Math.round(Number(data.total_usd)) -
          Math.round(Number(summa_out.total_usd_out));
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

    console.log(result);
    result.forEach((item) => {
      sumResults.total_sum_out = item.total_sum;
      sumResults.total_usd_out = item.total_usd;
    });
    return sumResults;
  }

  public async getClientByApartment() {
    let res, updateRes, subRes;

    res = await this.orderRepo.manager
      .createQueryBuilder(Buildings, 'buildings')
      .leftJoinAndSelect(
        'buildings.buildingItems',
        'buildingItems',
        'buildingItems.building_id=buildings.id',
      )
      .leftJoinAndSelect(
        'buildings.towns',
        'towns',
        'towns.id=buildings.town_id',
      )
      .select([
        'buildings.id as building_id',
        'buildings.entrance_number as entrance_number',
        'buildings.floor_number as floor_number',
        'buildings.apartment_number as apartment_number',
        'towns.name as townname',
        'buildings.name as buildingname',
        'buildingItems.mk_price as mk_price',
      ])
      .where('buildingItems.is_active= :is_active', { is_active: true })
      .orderBy('building_id', 'ASC')
      .getRawMany();

    updateRes = await Promise.all(
      res.map(async (data) => {
        let summa_out, summa_cash, summa_bank;
        let apartments;
        apartments = await this.clientOrder(data);
        data['apartments'] = apartments;
        return data;
      }),
    );
    return updateRes;
  }
  // public async getClientByApartment() {
  //   let res;
  //   let updatedRes;
  //   res = await this.orderRepo.manager
  //     .createQueryBuilder(Orders, 'orders')
  //     .leftJoinAndSelect(
  //       'orders.clients',
  //       'clients',
  //       'clients.id=orders.client_id',
  //     )
  //     .leftJoinAndSelect(
  //       'orders.orderItems',
  //       'orderitems',
  //       'orderitems.order_id=orders.id',
  //     )
  //     .leftJoinAndSelect(
  //       'orderitems.apartments',
  //       'apartments',
  //       'apartments.id=orderitems.apartment_id',
  //     )
  //     .leftJoinAndSelect(
  //       'apartments.floor',
  //       'floor',
  //       'floor.id=apartments.floor_id',
  //     )
  //     .leftJoinAndSelect(
  //       'floor.entrance',
  //       'entrance',
  //       'entrance.id=floor.entrance_id',
  //     )
  //     .leftJoinAndSelect(
  //       'entrance.buildings',
  //       'buildings',
  //       'buildings.id=entrance.building_id',
  //     )
  //     .leftJoinAndSelect(
  //       'buildings.towns',
  //       'towns',
  //       'towns.id=buildings.town_id',
  //     )
  //     .select([
  //       'orders.id as order_id',
  //       'clients.id as client_id',
  //       'clients.first_name',
  //       'clients.last_name',
  //       'clients.middle_name',
  //       'clients.contact_number as phone',
  //       'clients.description as description',
  //       'orders.id as order_number',
  //       'orders.total_amount as total_amount',
  //       'orders.total_amount_usd as total_amount_usd',
  //       'orderitems.price as price',
  //       'orderitems.price_usd as price_usd',
  //       'towns.name as townname',
  //       'buildings.name as buildingname',
  //       'entrance.entrance_number',
  //       'floor.floor_number',
  //       'apartments.cells as room_cells',
  //       'apartments.room_number',
  //       'apartments.room_space',
  //       'buildings.mk_price',
  //     ])
  //     .where('orders.order_status IN(:...orderStatus)', {
  //       orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
  //     })
  //      .orderBy('orders.id', 'DESC')
  //     .getRawMany();
  //
  //   updatedRes = await Promise.all(
  //     res.map(async (data) => {
  //       let summa_out, summa_cash, summa_bank;
  //       summa_out = await this.clientPayment(data.order_id, data.client_id, [
  //         Paymentmethods.CARD,
  //         Paymentmethods.CASH,
  //         Paymentmethods.BANK,
  //       ]).then((response) => {
  //         return response;
  //       });
  //       summa_cash = await this.clientPayment(data.order_id, data.client_id, [
  //         Paymentmethods.CASH,
  //         Paymentmethods.CARD,
  //       ]).then((response) => {
  //         return response;
  //       });
  //       summa_bank = await this.clientPayment(data.order_id, data.client_id, [
  //         Paymentmethods.BANK,
  //       ]).then((response) => {
  //         return response;
  //       });
  //       data['total_sum_out'] = summa_out.total_sum_out;
  //       data['total_sum_out_usd'] = summa_out.total_usd_out;
  //       data['total_sum_cash'] = summa_cash.total_sum_out;
  //       data['total_sum_cash_usd'] = summa_cash.total_usd_out;
  //       data['total_bank'] = Number(summa_bank.total_sum_out);
  //       data['total_bank_usd'] = Number(summa_bank.total_usd_out);
  //       data['due_total_sum'] =
  //         Number(data.total_amount) - Number(summa_out.total_sum_out);
  //       data['due_total_usd'] =
  //         Number(data.total_amount_usd) - Number(summa_out.total_usd_out);
  //       return data;
  //     }),
  //   );
  //   return updatedRes;
  // }

  async clientOrder(data: any) {
    try {
      let apartments, subRes;

      // Retrieve apartment data using TypeORM QueryBuilder
      apartments = await this.orderRepo.manager
        .createQueryBuilder(Apartments, 'apartments')
        .leftJoinAndSelect(
          'apartments.floor',
          'floor',
          'floor.id = apartments.floor_id',
        )
        .leftJoinAndSelect(
          'floor.entrance',
          'entrance',
          'entrance.id = floor.entrance_id',
        )
        .leftJoinAndSelect(
          'entrance.buildings',
          'buildings',
          'buildings.id = entrance.building_id',
        )
        .leftJoinAndSelect(
          'buildings.buildingItems',
          'buildingItems',
          'buildingItems.building_id=buildings.id',
        )
        // .leftJoinAndSelect('apartments.orderItems', 'orderItems', 'orderItems.apartment_id = apartments.id')
        // .leftJoinAndSelect('orderItems.orders', 'orders', 'orders.id = orderItems.order_id')
        // .leftJoinAndSelect('orders.clients', 'clients', 'clients.id = orders.client_id')
        .select([
          // 'orders.id as order_id',
          // 'clients.id as client_id',
          // 'clients.first_name',
          // 'clients.last_name',
          // 'clients.middle_name',
          // 'clients.contact_number as phone',
          // 'clients.description as description',
          // 'orders.id as order_number',
          // 'orders.total_amount as total_amount',
          // 'orders.total_amount_usd as total_amount_usd',
          // 'orderItems.price as price',
          // 'orderItems.price_usd as price_usd',
          'buildings.name as buildingname',
          'entrance.entrance_number as entrance_number',
          'floor.floor_number as floor_number',
          'apartments.id as apartment_id',
          'apartments.cells as room_cells',
          'apartments.room_number as room_number',
          'apartments.room_space as room_space',
          'buildingItems.mk_price as mk_price',
          'buildings.id as building_id',
          'buildings.apartment_number as apartment_number',
        ])
        .where('buildings.id = :building_id', { building_id: data.building_id })
        .andWhere('buildingItems.is_active = :is_active', { is_active: true })
        .orderBy('entrance_number', 'ASC')
        .orderBy('floor_number', 'DESC')
        .orderBy('room_number', 'DESC')
        .getRawMany();

      // Use Promise.all to execute clientPayment for each apartment in parallel
      subRes = await Promise.all(
        apartments.map(async (apartmentData) => {
          // Destructure relevant data from the apartment
          const {
            // order_id,
            // client_id,
            apartment_id,
            // total_amount,
            // total_amount_usd,
          } = apartmentData;

          // Call clientPayment with different payment methods
          const orders = await this.clientByApartMenClient(apartment_id);

          const [summa_out, summa_cash, summa_bank] = await Promise.all([
            this.clientPayment(
              orders ? orders.order_id : 0,
              orders ? orders.client_id : 0,
              [Paymentmethods.CARD, Paymentmethods.CASH, Paymentmethods.BANK],
              apartment_id,
            ),
            this.clientPayment(
              orders ? orders.order_id : 0,
              orders ? orders.client_id : 0,
              [Paymentmethods.CASH, Paymentmethods.CARD],
              apartment_id,
            ),
            this.clientPayment(
              orders ? orders.order_id : 0,
              orders ? orders.client_id : 0,
              [Paymentmethods.BANK],
              apartment_id,
            ),
          ]);

          // Calculate and assign values to the apartmentData object
          apartmentData['clients_first_name'] = orders
            ? orders.clients_first_name
            : '';
          apartmentData['clients_last_name'] = orders
            ? orders.clients_last_name
            : '';
          apartmentData['clients_middle_name'] = orders
            ? orders.clients_middle_name
            : '';
          apartmentData['price'] = orders ? orders.price : '';
          apartmentData['price_usd'] = orders ? orders.price_usd : '';
          apartmentData['order_number'] = orders ? orders.order_number : '';
          apartmentData['phone'] = orders ? orders.phone : '';
          apartmentData['total_sum_out'] = summa_out.total_sum_out;
          apartmentData['total_sum_out_usd'] = summa_out.total_usd_out;
          apartmentData['total_sum_cash'] = summa_cash.total_sum_out;
          apartmentData['total_sum_cash_usd'] = summa_cash.total_usd_out;
          apartmentData['total_bank'] = Number(summa_bank.total_sum_out);
          apartmentData['total_bank_usd'] = Number(summa_bank.total_usd_out);
          const total_amount = orders ? orders.total_amount : 0;
          apartmentData['total_amount'] = total_amount;
          apartmentData['due_total_sum'] = Number(summa_out.total_sum_out)
            ? Number(total_amount) - Number(summa_out.total_sum_out)
            : 0;
          apartmentData['due_total_usd'] =
            Math.round(Number(orders ? orders.total_amount_usd : 0)) -
            Math.round(Number(summa_out.total_usd_out));

          return apartmentData;
        }),
      );

      return subRes;
    } catch (error) {
      // Handle errors appropriately
      console.error('Error in clientOrder:', error);
      throw error;
    }
  }
  async clientByApartMenClient(apartment_id: number) {
    const orders = await this.orderRepo.manager
      .createQueryBuilder(Orders, 'orders')
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id = orders.client_id',
      )
      .leftJoinAndSelect(
        'orders.orderItems',
        'orderItems',
        'orders.id = orderItems.order_id',
      )
      .leftJoinAndSelect(
        'orderItems.apartments',
        'apartments',
        'orderItems.apartment_id=apartments.id',
      )
      .select([
        'orders.id as order_id',
        'clients.id as client_id',
        'clients.first_name',
        'clients.last_name',
        'clients.middle_name',
        'clients.contact_number as phone',
        'clients.description as description',
        'orders.id as order_number',
        'orders.total_amount as total_amount',
        'orders.total_amount_usd as total_amount_usd',
        'orderItems.price as price',
        'orderItems.price_usd as price_usd',
      ])
      .where('apartments.id= :apartment_id', { apartment_id })
      .andWhere('orders.order_status IN(:...status)', {
        status: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      })
      .getRawOne();

    return orders;
  }
  async clientPayment(
    order_id: number,
    client_id: number,
    paymentmethods: Paymentmethods[],
    apartment_id: number,
  ) {
    const sumResults = {
      total_sum_out: 0,
      total_usd_out: 0,
    };
    let result;
    result = await this.orderRepo.manager
      // .createQueryBuilder(Payments, 'payments')
      .createQueryBuilder(Orders, 'orders')
      .leftJoinAndSelect(
        'orders.orderItems',
        'orderItems',
        'orderItems.order_id=orders.id',
      )
      .leftJoinAndSelect(
        'orderItems.apartments',
        'apartments',
        'apartments.id=orderItems.apartment_id',
      )
      .leftJoinAndSelect(
        'orders.payments',
        'payments',
        'orders.id=payments.order_id',
      )
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id=orders.client_id',
      )

      .select([
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])
      .where('payments.paymentmethods IN(:...paymethods)', {
        paymethods: paymentmethods,
      })
      .andWhere('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .andWhere('orders.order_status IN(:...status)', {
        status: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      })
      //   .andWhere('orders.order_date= :order_date', { order_date })
      .andWhere('orders.id= :order_id', { order_id })
      .andWhere('orders.client_id= :client_id', { client_id })
      .andWhere('apartments.id= :apartment_id', { apartment_id })
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum_out = +item.total_sum;
      sumResults.total_usd_out = +item.total_usd;
    });
    return sumResults;
  }

  async clientPaymentOut(
    order_id: number,
    client_id: number,
    paymentmethods: Paymentmethods[],
  ) {
    const sumResults = {
      total_sum_out: 0,
      total_usd_out: 0,
    };
    let result;
    result = await this.orderRepo.manager
      // .createQueryBuilder(Payments, 'payments')
      // .createQueryBuilder(Orders, 'orders')
      // .leftJoinAndSelect(
      //   'orders.orderItems',
      //   'orderItems',
      //   'orderItems.order_id=orders.id',
      // )
      // .leftJoinAndSelect(
      //   'orderItems.apartments',
      //   'apartments',
      //   'apartments.id=orderItems.apartment_id',
      // )
      // .leftJoinAndSelect(
      //   'orders.payments',
      //   'payments',
      //   'orders.id=payments.order_id',
      // )
      // .leftJoinAndSelect(
      //   'orders.clients',
      //   'clients',
      //   'clients.id=orders.client_id',
      // )
      .createQueryBuilder(Payments, 'payments')
      .leftJoinAndSelect(
        'payments.orders',
        'orders',
        'orders.id=payments.order_id',
      )
      .leftJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
      .select([
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])
      .where('payments.paymentmethods IN(:...paymethods)', {
        paymethods: paymentmethods,
      })
      .andWhere('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .andWhere('orders.order_status IN(:...status)', {
        status: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      })
      //   .andWhere('orders.order_date= :order_date', { order_date })
      .andWhere('orders.id= :order_id', { order_id })
      .andWhere('orders.client_id= :client_id', { client_id })
      // .andWhere('apartments.id= :apartment_id', { apartment_id })
      .getRawMany();
    console.log(order_id + ' ' + client_id);
    result.forEach((item) => {
      sumResults.total_sum_out = +item.total_sum;
      sumResults.total_usd_out = +item.total_usd;
    });
    return sumResults;
  }

  async summaryReport() {
    let result, res;
    const summa_real = 0;
    res = await this.orderRepo.manager
      .createQueryBuilder(Buildings, 'buildings')
      .leftJoinAndSelect(
        'buildings.buildingItems',
        'buildingItems',
        'buildingItems.building_id=buildings.id',
      )
      .leftJoinAndSelect(
        'buildings.towns',
        'towns',
        'towns.id=buildings.town_id',
      )
      .select([
        'buildings.id as build_id',
        'towns.name as townname',
        'buildings.name as buildingname',
        'buildingItems.mk_price as mk_price',
      ])
      .where('buildingItems.is_active=:is_active', { is_active: true })
      .orderBy('buildings.id', 'ASC')
      .getRawMany();

    result = await Promise.all(
      res.map(async (data) => {
        try {
          const [summa, summabank, summa_out, summabank_out] =
            await Promise.all([
              this.allSummaryPayment(data.build_id, [
                Paymentmethods.CASH,
                Paymentmethods.CARD,
              ]),
              this.allSummaryPayment(data.build_id, [Paymentmethods.BANK]),
              this.allSummaryPaymentOut(data.build_id, [
                Paymentmethods.CASH,
                Paymentmethods.CARD,
              ]),
              this.allSummaryPaymentOut(data.build_id, [Paymentmethods.BANK]),
            ]);

          const { all_room_space } = await this.orderRepo.manager
            .createQueryBuilder(Apartments, 'apartments')
            .leftJoinAndSelect(
              'apartments.floor',
              'floor',
              'floor.id=apartments.floor_id',
            )
            .leftJoinAndSelect(
              'floor.entrance',
              'entrances',
              'entrances.id=floor.entrance_id',
            )
            .leftJoinAndSelect(
              'entrances.buildings',
              'buildings',
              'buildings.id=entrances.building_id',
            )
            .where('buildings.id= :building_id', { building_id: data.build_id })
            .select('SUM(apartments.room_space)', 'all_room_space')
            .getRawOne();

          const order_apartments = await this.orderRepo.manager
            .createQueryBuilder(OrderItems, 'orderItems')
            .leftJoin(
              'orderItems.apartments',
              'apartments',
              'apartments.id=orderItems.apartment_id',
            )
            .leftJoin(
              'orderItems.orders',
              'orders',
              'orders.id=orderItems.order_id',
            )

            .leftJoin(
              'apartments.floor',
              'floor',
              'floor.id=apartments.floor_id',
            )
            .leftJoin(
              'floor.entrance',
              'entrance',
              'entrance.id=floor.entrance_id',
            )
            .leftJoin(
              'entrance.buildings',
              'buildings',
              'buildings.id=entrance.building_id',
            )
            .select([
              'orderItems.price as price',
              'apartments.room_space as room_space',
            ])
            .where('buildings.id= :build_id', { build_id: data.build_id })
            .andWhere('orders.order_status IN(:...status)', {
              status: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
            })
            .getRawMany();

          let summa_real = 0;

          order_apartments.forEach((orderData) => {
            const real_price = Number(orderData.price) - Number(data.mk_price);
            summa_real += Number(real_price) * Number(orderData.room_space);
          });

          const order_apartment = await this.orderAllApartment(data.build_id);

          data['all_room_space'] = all_room_space;
          data['total_room_price'] =
            Number(all_room_space) * Number(data.mk_price) + summa_real;
          data['order_room_space'] = order_apartment?.room_space;
          data['order_all_price'] = order_apartment?.total_amount;
          data['total_sum_cash'] =
            Number(summa.total_sum) - Number(summa_out.total_sum);
          data['total_sum_bank'] =
            Number(summabank.total_sum) - Number(summabank_out.total_sum);
          data['total_sum_due'] =
            Number(all_room_space) * Number(data.mk_price) +
            summa_real -
            (Number(summabank.total_sum) -
              Number(summabank_out.total_sum) +
              (Number(summa.total_sum) - Number(summa_out.total_sum)));

          // data['total_sum_due'] =Number(summabank.total_sum) + Number(summa.total_sum) -((Number(summabank_out.total_sum) + Number(summa_out.total_sum)));

          return data;
        } catch (error) {
          console.error('Error in processing data:', error);
        }
      }),
    );
    // result = await Promise.all(
    //   res.map(async (data) => {
    //     let summa, summabank, summacard,summa_out,summabank_out;
    //     summa = await this.allSummaryPayment(data.build_id, [
    //       Paymentmethods.CASH,
    //       Paymentmethods.CARD,
    //     ]).then((data) => {
    //       return data;
    //     });
    //     summabank = await this.allSummaryPayment(data.build_id, [
    //       Paymentmethods.BANK,
    //     ]).then((data) => {
    //       return data;
    //     });
    //
    //     summa_out = await this.allSummaryPaymentOut(data.build_id, [
    //       Paymentmethods.CASH,
    //       Paymentmethods.CARD,
    //     ]).then((data) => {
    //       return data;
    //     });
    //     summabank_out = await this.allSummaryPaymentOut(data.build_id, [
    //       Paymentmethods.BANK,
    //     ]).then((data) => {
    //       return data;
    //     });
    //
    //     const { all_room_space } = await this.orderRepo.manager
    //       .createQueryBuilder(Apartments, 'apartments')
    //       .leftJoinAndSelect(
    //         'apartments.floor',
    //         'floor',
    //         'floor.id=apartments.floor_id',
    //       )
    //       .leftJoinAndSelect(
    //         'floor.entrance',
    //         'entrances',
    //         'entrances.id=floor.entrance_id',
    //       )
    //       .leftJoinAndSelect(
    //         'entrances.buildings',
    //         'buildings',
    //         'buildings.id=entrances.building_id',
    //       )
    //       .where('buildings.id= :building_id', { building_id: data.build_id })
    //       .select('SUM(apartments.room_space)', 'all_room_space')
    //       .getRawOne();
    //
    //     const order_apartments = await this.orderRepo.manager
    //       .createQueryBuilder(OrderItems, 'orderItems')
    //       .leftJoin(
    //         'orderItems.apartments',
    //         'apartments',
    //         'apartments.id=orderItems.apartment_id',
    //       )
    //       .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
    //       .leftJoin(
    //         'floor.entrance',
    //         'entrance',
    //         'entrance.id=floor.entrance_id',
    //       )
    //       .leftJoin(
    //         'entrance.buildings',
    //         'buildings',
    //         'buildings.id=entrance.building_id',
    //       )
    //       .select([
    //         'orderItems.price as price',
    //         'apartments.room_space as room_space',
    //       ])
    //       .where('buildings.id= :build_id', { build_id: data.build_id })
    //       .getRawMany();
    //     const buildin_price = data.mk_price;
    //
    //     order_apartments.forEach((data) => {
    //       const real_price = Number(data.price) - Number(buildin_price);
    //       summa_real += Number(real_price) * Number(data.room_space);
    //     });
    //     const order_apartment = await this.orderAllApartment(data.build_id);
    //     data['all_room_space'] = all_room_space;
    //     data['total_room_price'] = Number(all_room_space) * Number(data.mk_price) + summa_real;
    //     data['order_room_space'] = order_apartment?.room_space;
    //     data['order_all_price'] = order_apartment?.total_amount;
    //     data['total_sum_cash'] = Number(summa.total_sum)-Number(summa_out.total_sum);
    //     data['total_sum_bank'] = Number(summabank.total_sum)-Number(summabank_out.total_sum);
    //     data['total_sum_due'] =
    //       Number(summabank.total_sum) + Number(summa.total_sum)
    //         ? Number(all_room_space) * Number(data.mk_price) +
    //           summa_real -
    //           ((Number(summabank.total_sum)-Number(summabank_out.total_sum)) + (Number(summa.total_sum)-Number(summa_out.total_sum)))
    //         : 0;
    //     return data;
    //   }),
    // );
    return result;
  }
  async orderAllApartment(build_id: number) {
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
        'SUM(apartments.room_space) as room_space',
        'SUM(orderitems.price*apartments.room_space) as total_amount',
      ])
      .where('orders.order_status IN(:...orderStatus)', {
        orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      })
      .where('buildings.id= :build_id', { build_id: build_id })
      .groupBy('buildings.id')
      .getRawOne();
    return res;
  }
  // async summaryReport() {
  //   let result, res;
  //   res = await this.orderRepo.manager
  //     .createQueryBuilder(Orders, 'orders')
  //     .leftJoinAndSelect(
  //       'orders.clients',
  //       'clients',
  //       'clients.id=orders.client_id',
  //     )
  //     .leftJoinAndSelect(
  //       'orders.orderItems',
  //       'orderitems',
  //       'orderitems.order_id=orders.id',
  //     )
  //     .leftJoinAndSelect(
  //       'orderitems.apartments',
  //       'apartments',
  //       'apartments.id=orderitems.apartment_id',
  //     )
  //
  //     .leftJoinAndSelect(
  //       'apartments.floor',
  //       'floor',
  //       'floor.id=apartments.floor_id',
  //     )
  //     .leftJoinAndSelect(
  //       'floor.entrance',
  //       'entrance',
  //       'entrance.id=floor.entrance_id',
  //     )
  //     .leftJoinAndSelect(
  //       'entrance.buildings',
  //       'buildings',
  //       'buildings.id=entrance.building_id',
  //     )
  //     .leftJoinAndSelect(
  //       'buildings.towns',
  //       'towns',
  //       'towns.id=buildings.town_id',
  //     )
  //     .leftJoinAndSelect(
  //       'orders.payments',
  //       'payments',
  //       'orders.id=payments.order_id',
  //     )
  //     .select([
  //       'buildings.id as build_id',
  //       'towns.name as townname',
  //       'buildings.name as buildingname',
  //       'SUM(apartments.room_space) as room_space',
  //       'SUM(orderitems.price) as price',
  //       'SUM(orderitems.price*apartments.room_space) as total_amount',
  //     ])
  //     .where('orders.order_status IN(:...orderStatus)', {
  //       orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
  //     })
  //     .andWhere('payments.caisher_type=:caisher_type', {
  //       caisher_type: Caishertype.IN,
  //     })
  //     .groupBy('towns.id')
  //     .addGroupBy('buildings.id')
  //     .getRawMany();
  //
  //   result = await Promise.all(
  //     res.map(async (data) => {
  //       let summa, summabank, summacard;
  //
  //       const appart_data = await this.orderRepo.manager
  //         .getRepository(Apartments)
  //         .createQueryBuilder('apartments')
  //         .leftJoinAndSelect(
  //           'apartments.floor',
  //           'floor',
  //           'floor.id=apartments.floor_id',
  //         )
  //         .leftJoinAndSelect(
  //           'floor.entrance',
  //           'entrance',
  //           'entrance.id=floor.entrance_id',
  //         )
  //         .leftJoinAndSelect(
  //           'entrance.buildings',
  //           'buildings',
  //           'buildings.id=entrance.building_id',
  //         )
  //         .leftJoinAndSelect(
  //           'buildings.towns',
  //           'towns',
  //           'towns.id=buildings.town_id',
  //         )
  //         .select('SUM(apartments.room_space) as all_room_space')
  //         .addSelect(
  //           'SUM(apartments.room_space*buildings.mk_price) as all_apartment_sum',
  //         )
  //         // .addSelect('buildings.mk_price as mk_price')
  //         // .where('buildings.id = :id', { id: data.build_id })
  //
  //         .getRawOne();
  //
  //       summa = await this.allSummaryPayment(data.build_id, [
  //         Paymentmethods.CASH,
  //         Paymentmethods.CARD,
  //       ]).then((data) => {
  //         return data;
  //       });
  //       summabank = await this.allSummaryPayment(data.build_id, [
  //         Paymentmethods.BANK,
  //       ]).then((data) => {
  //         return data;
  //       });
  //
  //       // summacard = await this.allSummaryPayment(data.build_id, [
  //       //   Paymentmethods.CARD,
  //       // ]).then((data) => {
  //       //   return data;
  //       // });
  //
  //       data['all_room_space'] = Number(appart_data.all_room_space);
  //       data['all_apartment_sum'] = Number(appart_data.all_apartment_sum);
  //       // data['all_apartment_price'] = Number(appart_data.mk_price);
  //       data['total_sum_cash'] = Number(summa.total_sum);
  //       data['total_sum_bank'] = Number(summabank.total_sum);
  //       data['total_sum_due'] =
  //         Number(summabank.total_sum) + Number(summa.total_sum)
  //           ? Number(data.total_amount) -
  //             (Number(summabank.total_sum) + Number(summa.total_sum))
  //           : 0;
  //       return data;
  //     }),
  //   );
  //
  //   return result;
  // }

  async allSummaryPayment(build_id: number, paymentMethod: Paymentmethods[]) {
    const sumResults = {
      total_sum: 0,
      total_usd: 0,
    };
    let result;

    result = await this.orderRepo.manager
      .createQueryBuilder(Apartments, 'apartments')
      .leftJoinAndSelect(
        'apartments.floor',
        'floor',
        'floor.id = apartments.floor_id',
      )
      .leftJoinAndSelect(
        'floor.entrance',
        'entrance',
        'entrance.id = floor.entrance_id',
      )
      .leftJoinAndSelect(
        'entrance.buildings',
        'buildings',
        'buildings.id = entrance.building_id',
      )
      .leftJoinAndSelect(
        'buildings.towns',
        'towns',
        'towns.id = buildings.town_id',
      )
      .leftJoinAndSelect(
        'apartments.orderItems',
        'orderItems',
        'orderItems.apartment_id = apartments.id',
      )
      .leftJoinAndSelect(
        'orderItems.orders',
        'orders',
        'orders.id = orderItems.order_id',
      )
      .leftJoin(
        'orderItems.orders',
        'ordersLeftJoin',
        'ordersLeftJoin.id = orderItems.order_id',
      )
      .leftJoin('orders.payments', 'payments', 'payments.order_id = orders.id')
      .select([
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])
      .where('buildings.id = :build_id', { build_id: build_id })
      .andWhere('payments.caisher_type = :cash', { cash: Caishertype.IN })
      .andWhere('payments.paymentmethods IN (:...paymethod)', {
        paymethod: paymentMethod,
      })
      // .andWhere('orders.order_status IN (:...status)', {
      //   status: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
      // })
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum = item.total_sum;
      sumResults.total_usd = item.total_usd;
    });
    return sumResults;
  }

  async allSummaryPaymentOut(
    build_id: number,
    paymentMethod: Paymentmethods[],
  ) {
    const sumResults = {
      total_sum: 0,
      total_usd: 0,
    };
    let result;

    result = await this.orderRepo.manager
      .createQueryBuilder(Apartments, 'apartments')
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
      .leftJoin(
        'apartments.orderItems',
        'orderItems',
        'orderItems.apartment_id=apartments.id',
      )
      .leftJoin('orderItems.orders', 'orders', 'orders.id=orderItems.order_id')
      .leftJoin('orders.payments', 'payments', 'payments.order_id=orders.id')
      .select([
        'SUM(payments.amount) AS total_sum',
        'SUM(payments.amount_usd) AS total_usd',
      ])
      .where('buildings.id= :build_id', { build_id: build_id })
      .andWhere('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('payments.paymentmethods IN(:...paymethod)', {
        paymethod: paymentMethod,
      })
      .andWhere('orders.order_status= :status', {
        status: OrderStatus.REFUNDED,
      })
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum = item.total_sum;
      sumResults.total_usd = item.total_usd;
    });
    return sumResults;
  }
  async getSaleSummaryReport() {
    try {
      let result;
      // Use TypeORM QueryBuilder to fetch data
      const res = await this.orderRepo.manager
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
          'buildings.buildingItems',
          'buildingItems',
          'buildingItems.building_id=buildings.id',
        )
        .leftJoinAndSelect(
          'buildings.towns',
          'towns',
          'towns.id=buildings.town_id',
        )
        .select([
          'buildingItems.building_id as building_id',
          'towns.id as town_id',
          'towns.name as townname',
          'buildings.name as buildingname',
          'buildingItems.mk_price as mk_price',
        ])
        // .groupBy('buildings.id')
        .groupBy('buildingItems.building_id')
        .addGroupBy('towns.id')
        .addGroupBy('buildings.name')
        .orderBy('buildings.id', 'ASC')
        .getRawMany();

      // No need for Promise.all here, but keeping it in case of future changes
      result = await Promise.all(
        res.map(async (data) => {
          const resord = await this.orderRepo.manager
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
              'buildings.id as build_id',
              'towns.name as townname',
              'buildings.name as buildingname',
              'apartments.room_space as room_space',
              'apartments.room_number as room_number',
              'orderitems.price as price',
              'orderitems.price_usd as price_usd',
              "TO_CHAR(orders.order_date,'DD.MM.YYYY') as order_date",
            ])
            .where('orders.order_status IN(:...orderStatus)', {
              orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
            })
            .andWhere('buildings.id= :build_id', { build_id: data.building_id })
            // .groupBy('towns.id')
            // .groupBy('buildings.id')
            // .addGroupBy("TO_CHAR(orders.order_date,'DD.MM.YYYY')")
            .orderBy('buildings.id', 'ASC')
            .addOrderBy('order_date', 'DESC')
            .getRawMany();

          const { sum } = await this.orderRepo.manager
            .getRepository(Apartments)
            .createQueryBuilder('apartments')
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
            .select('SUM(apartments.room_space)', 'sum')
            .where('buildings.id = :id', { id: data.building_id })
            .getRawOne();

          const resultpay = await Promise.all(
            resord.map(async (data) => {
              let summa, summabank, initial_sum, return_sum;

              summa = await this.allSaleSummaryPayment(
                data.build_id,
                Paymentmethods.CASH,
                data.order_id,
              ).then((data) => {
                return data;
              });
              summabank = await this.allSaleSummaryPayment(
                data.build_id,
                Paymentmethods.BANK,
                data.order_id,
              ).then((data) => {
                return data;
              });
              data['data_month'] = [
                {
                  total_sum_cahs: Number(summa.total_sum),
                  total_sum_bank: Number(summabank.total_sum),
                  total_sum_due:
                    Number(summa.total_sum) + Number(summabank.total_sum),
                },
              ];

              return data;
            }),
          );
          data['all_room_space'] = sum;
          data['apartments'] = resultpay;
          return data;
        }),
      );

      if (result.length > 0) {
        return {
          success: true,
          data: result,
          message: 'Fetch all data successful!',
        };
      } else {
        return {
          success: true,
          message: 'No records found!',
        };
      }
    } catch (error) {
      // Handle errors appropriately
      console.error('Error in getSaleSummaryReport:', error);
      throw error;
    }
  }

  // res = await this.orderRepo.manager
  //   .createQueryBuilder(Orders, 'orders')
  //   .leftJoinAndSelect(
  //     'orders.clients',
  //     'clients',
  //     'clients.id=orders.client_id',
  //   )
  //   .leftJoinAndSelect(
  //     'orders.orderItems',
  //     'orderitems',
  //     'orderitems.order_id=orders.id',
  //   )
  //   .leftJoinAndSelect(
  //     'orderitems.apartments',
  //     'apartments',
  //     'apartments.id=orderitems.apartment_id',
  //   )
  //   .leftJoinAndSelect(
  //     'apartments.floor',
  //     'floor',
  //     'floor.id=apartments.floor_id',
  //   )
  //   .leftJoinAndSelect(
  //     'floor.entrance',
  //     'entrance',
  //     'entrance.id=floor.entrance_id',
  //   )
  //   .leftJoinAndSelect(
  //     'entrance.buildings',
  //     'buildings',
  //     'buildings.id=entrance.building_id',
  //   )
  //   .leftJoinAndSelect(
  //     'buildings.towns',
  //     'towns',
  //     'towns.id=buildings.town_id',
  //   )
  //   .select([
  //     'orders.id as order_id',
  //     'buildings.id as build_id',
  //     'towns.name as townname',
  //     'buildings.name as buildingname',
  //     'apartments.room_space as room_space',
  //     'orderitems.price as mk_price',
  //     "TO_CHAR(orders.order_date,'DD.MM.YYYY') as order_date",
  //   ])
  //   .where('orders.order_status IN(:...orderStatus)', {
  //     orderStatus: [OrderStatus.ACTIVE, OrderStatus.COMPLETED],
  //   })
  //   // .groupBy('towns.id')
  //   // .groupBy('buildings.id')
  //   // .addGroupBy("TO_CHAR(orders.order_date,'DD.MM.YYYY')")
  //   .orderBy('buildings.id', 'ASC')
  //   .addOrderBy('order_date', 'DESC')
  //   .getRawMany();
  //
  // const { sum } = await this.orderRepo.manager
  //   .getRepository(Apartments)
  //   .createQueryBuilder('apartments')
  //   .leftJoinAndSelect(
  //     'apartments.floor',
  //     'floor',
  //     'floor.id=apartments.floor_id',
  //   )
  //   .leftJoinAndSelect(
  //     'floor.entrance',
  //     'entrance',
  //     'entrance.id=floor.entrance_id',
  //   )
  //   .leftJoinAndSelect(
  //     'entrance.buildings',
  //     'buildings',
  //     'buildings.id=entrance.building_id',
  //   )
  //   .leftJoinAndSelect(
  //     'buildings.towns',
  //     'towns',
  //     'towns.id=buildings.town_id',
  //   )
  //   .select('SUM(apartments.room_space)', 'sum')
  //   // .where('buildings.id = :id', { id: data.build_id })
  //   .getRawOne();
  //
  // result = await Promise.all(
  //   res.map(async (data) => {
  //     let summa, summabank, initial_sum, return_sum;
  //
  //     summa = await this.allSaleSummaryPayment(
  //       data.build_id,
  //       Paymentmethods.CASH,
  //       data.order_id,
  //     ).then((data) => {
  //       return data;
  //     });
  //     summabank = await this.allSaleSummaryPayment(
  //       data.build_id,
  //       Paymentmethods.BANK,
  //       data.order_id,
  //     ).then((data) => {
  //       return data;
  //     });
  //   data['data_month'] = [
  //       {
  //         total_sum_cahs: Number(summa.total_sum),
  //         total_sum_bank: Number(summabank.total_sum),
  //         total_sum_due:
  //           Number(summa.total_sum) + Number(summabank.total_sum),
  //       },
  //     ];
  //     return data;
  //   }),
  // );
  //
  // if (result) {
  //   return {
  //     success: true,
  //     data: result,
  //     all_room_space: sum,
  //     message: 'fetch all data!!!',
  //   };
  // } else {
  //   return { success: true, message: 'not record data!!!' };
  // }
  // }

  async returnReport() {
    let result, res;
    const clients = [];
    res = await this.orderRepo.manager
      .createQueryBuilder(Orders, 'orders')
      //  .leftJoin('orders.payments', 'payments', 'orders.id=payments.order_id')
      .innerJoin('orders.clients', 'clients', 'clients.id=orders.client_id')
      .innerJoin(
        'orders.orderItems',
        'orderitems',
        'orderitems.order_id=orders.id',
      )
      .innerJoin(
        'orderitems.apartments',
        'apartments',
        'apartments.id=orderitems.apartment_id',
      )
      .innerJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
      .innerJoin('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
      .innerJoin(
        'entrance.buildings',
        'buildings',
        'buildings.id=entrance.building_id',
      )
      .innerJoin('buildings.towns', 'towns', 'towns.id=buildings.town_id')
      .select([
        // 'apartments.id as apartment_id',
        'buildings.id as build_id',
        'towns.id as town_id',
        'towns.name as townname',
        'buildings.name as buildingname',
      ])
      .where('orders.order_status= :orderStatus', {
        orderStatus: OrderStatus.REFUNDED,
      })
      // .groupBy('apartments.id')
      .addGroupBy('buildings.id')
      .addGroupBy('towns.id')
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
        'orders.payments',
        'payments',
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
        'apartments.id as apartment_id',
        'apartments.room_number',
        "to_char(payments.payment_date,'MM-YYYY') as payment_date",
        'clients.id as client_id',
        'clients.first_name',
        'clients.last_name',
        'clients.middle_name',
        'clients.contact_number',
      ])
      .where('buildings.id= :building_id', { building_id: building_id })
      //  .andWhere('apartment_id= :apartment_id', { aparment_id: apartment_id })
      .andWhere('orders.order_status= :ord_status', {
        ord_status: OrderStatus.REFUNDED,
      })
      .groupBy('clients.id')
      .addGroupBy('apartments.id')
      .addGroupBy("to_char(payments.payment_date,'MM-YYYY')")
      .getRawMany();

    result = await Promise.all(
      res.map(async (data) => {
        data['payments_cash'] = await this.returnPayment(
          data.apartment_id,
          data.client_id,
          [Paymentmethods.CASH, Paymentmethods.CARD, Paymentmethods.USD],
          data.payment_date,
        );
        data['payments_bank'] = await this.returnPayment(
          data.apartment_id,
          data.client_id,
          [Paymentmethods.USD, Paymentmethods.BANK],
          data.payment_date,
        );
        return data;
      }),
    );

    return result;
  }

  async returnPayment(
    apartment_id: number,
    client_id: number,
    paymentMethod: Paymentmethods[],
    pay_data: string,
  ) {
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
        'orders.orderItems',
        'orderitems',
        'orderitems.order_id=orders.id',
      )
      .leftJoinAndSelect(
        'orderitems.apartments',
        'apartments',
        'apartments.id=orderitems.apartment_id',
      )
      // .leftJoinAndSelect(
      //   'apartments.floor',
      //   'floor',
      //   'floor.id=apartments.floor_id',
      // )
      // .leftJoinAndSelect(
      //   'floor.entrance',
      //   'entrance',
      //   'entrance.id=floor.entrance_id',
      // )
      // .leftJoinAndSelect(
      //   'entrance.buildings',
      //   'buildings',
      //   'buildings.id=entrance.building_id',
      // )
      // .leftJoinAndSelect(
      //   'buildings.towns',
      //   'towns',
      //   'towns.id=buildings.town_id',
      // )
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id=orders.client_id',
      )
      .select([
        // "to_char(payments.payment_date,'MM-YYYY') as payment_date",
        'SUM(payments.amount) as amount',
        'SUM(payments.amount_usd) as amount_usd',
      ])
      .where('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('payments.paymentmethods IN(:...method)', {
        method: paymentMethod,
      })
      .andWhere('clients.id= :client_id', { client_id: client_id })
      .andWhere('apartments.id= :apartment_id', { apartment_id })
      // .andWhere("to_char(payments.payment_date,'MM-YYYY')= :pay_date", {
      //   pay_date: pay_data,
      // })
      // .groupBy("to_char(payments.payment_date,'MM-YYYY')")
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
      // .leftJoinAndSelect(
      //   'orders.payments',
      //   'payments',
      //   'orders.id=payments.order_id',
      // )
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
        'clients.id as client_id',
        'clients.first_name as cfirst_name',
        'clients.last_name as flast_name',
        'clients.middle_name as fmiddle_name',
        'clients.contact_number as phone',
        'paymentMethods.name as paymethod',
        'SUM(orders.total_amount) as total_amount',
        'SUM(orders.total_amount_usd) as total_amount_usd',
      ])
      .where('orders.order_status IN(:...orderStatus)', {
        orderStatus: [OrderStatus.ACTIVE],
      })
      // .andWhere('payments.caisher_type=:caisher_type', {
      //   caisher_type: Caishertype.IN,
      // })
      .groupBy("to_char(orders.order_date,'DD.MM.YYYY')")
      .addGroupBy('orders.id')
      .addGroupBy('users.id')
      .addGroupBy('clients.id')
      // .addGroupBy('buildings.id')
      .addGroupBy('paymentMethods.id')
      //.addGroupBy('to_char(orders.order_date,\'DD.MM.YYYY\')')
      .orderBy('order_date', 'DESC')
      .getRawMany();

    result = await Promise.all(
      res.map(async (data) => {
        let payment, credit_table;
        payment = await this.clientPaymentOut(data.order_id, data.client_id, [
          Paymentmethods.CASH,
          Paymentmethods.CARD,
        ]);
        //  credit_table = await this.getCreditTable(data.order_id);
        data['payment'] = payment;
        // data['payment_months'] = credit_table;
        data['summary_due'] =
          Math.round(Number(data.total_amount)) -
          Math.round(Number(payment.total_sum_out));
        data['summary_due_usd'] =
          Math.round(Number(data.total_amount_usd)) -
          Math.round(Number(payment.total_usd_out));
        return data;
      }),
    );
    return result;
  }

  async allSaleSummaryPayment(
    build_id: number,
    paymentMethod: Paymentmethods,
    order_id: number,
  ) {
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
      .andWhere('payments.paymentmethods= :paymethod', {
        paymethod: paymentMethod,
      })
      .andWhere('orders.id= :order_id', { order_id })
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum = item.total_sum;
      sumResults.total_usd = item.total_usd;
    });
    return sumResults;
  }

  async allReturnPayment(build_id: number, date: string) {
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

      .where('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('buildings.id= :id', { id: build_id })
      .andWhere("TO_CHAR(orders.order_date,'MONTH-YYYY')=:date", { date })
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum = item.total_sum;
      sumResults.total_usd = item.total_usd;
    });

    return sumResults;
  }

  async allRetunSaleSummaryPayment(
    build_id: number,
    paymentMethod: Paymentmethods,
    date: string,
  ) {
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

      .where('payments.caisher_type= :cash', { cash: Caishertype.OUT })
      .andWhere('buildings.id= :id', { id: build_id })
      .andWhere('payments.paymentmethods=:paymethod', {
        paymethod: paymentMethod,
      })
      .andWhere("TO_CHAR(orders.order_date,'MONTH-YYYY')=:date", { date })
      .getRawMany();

    result.forEach((item) => {
      sumResults.total_sum = item.total_sum;
      sumResults.total_usd = item.total_usd;
    });
    return sumResults;
  }

  async summaryInitial(build_id: number, date: string) {
    let result, sumResults;

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
      .select(['SUM(orders.initial_pay) AS initial_pay'])

      .where('payments.caisher_type= :cash', { cash: Caishertype.IN })
      .andWhere('buildings.id= :id', { id: build_id })
      .andWhere("TO_CHAR(orders.order_date,'MONTH-YYYY')=:date", { date })
      .getRawMany();

    result.forEach((item) => {
      sumResults = item.initial_pay;
    });
    return sumResults;
  }

  public async getCreditTable(order_id: number) {
    let result;
    result = this.orderRepo.manager
      .createQueryBuilder(CreditTable, 'credittable')
      .select([
        "to_char(credittable.due_date,'DD-MM-YYYY') as due_date",
        'credittable.due_amount as due_amount',
        'credittable.status as status',
      ])
      .where('credittable.order_id= :order_id', { order_id: order_id })
      .getRawMany();
    return result;
  }
}
