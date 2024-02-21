import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Orders } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentMethods } from '../payment-method/entities/payment-method.entity';
import { OrderItems } from '../order-items/entities/order-item.entity';
import { Apartments } from '../apartments/entities/apartment.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Clients } from '../clients/entities/client.entity';
import { Users } from '../users/entities/user.entity';
import { PaymentsService } from '../payments/payments.service';
import { Caisher } from '../caisher/entities/caisher.entity';
import { Caishertype } from 'src/common/enums/caishertype';
import { Paymentmethods } from 'src/common/enums/paymentmethod';
import { Payments } from '../payments/entities/payment.entity';
import { Booking } from '../booking/entities/booking.entity';
import { ApartmentStatus } from '../../common/enums/apartment-status';
import { OrderStatus } from '../../common/enums/order-status';
import { PaymentStatus } from 'src/common/enums/payment-status';
import { ExchangRates } from '../exchang-rates/entities/exchang-rate.entity';
import { RefundDto } from './dto/refund.dto';
import { Buildings } from '../buildings/entities/building.entity';
import { BuildingItems } from '../buildings/entities/buildingitems.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Orders)
    private readonly ordersRepository: Repository<Orders>,
    private readonly paymentService: PaymentsService,
  ) {}

  //==================== yangi qo'shiladigan shartnima raqami ===========================

  async getLastID() {
    return await this.ordersRepository
      .createQueryBuilder('orders')
      .orderBy('id', 'DESC')
      .getOne();
  }

  // =================== Yangi shartnoma tuzisha ===================================

  async createOrder(createOrderDto: CreateOrderDto, users: any) {
    //shartnoma tuziliyotgan vaqtdagi dollar kursi

    const usdRate = await ExchangRates.findOne({ where: { is_default: true } });

    const payment_method = await PaymentMethods.findOne({
      where: { id: +createOrderDto.payment_method_id },
    });

    const checkApartment = await Apartments.findOne({
      where: { id: +createOrderDto.apartment_id },
    });

    if (
      checkApartment.status === ApartmentStatus.SOLD ||
      checkApartment.status === ApartmentStatus.INACTIVE
    ) {
      throw new HttpException(
        'Xonadon allaqachon sotilgan',
        HttpStatus.BAD_REQUEST,
      );
    }

    let initial_pay, deal_price, kv_price_usd, kv_price, mk_price, mk_price_usd;

    if (payment_method.name_alias === 'dollar') {
      deal_price = createOrderDto.price * usdRate.rate_value;
      initial_pay = createOrderDto.initial_pay * usdRate.rate_value;
      kv_price = createOrderDto.price * usdRate.rate_value;
      kv_price_usd = Math.round(Number(createOrderDto.price));
      mk_price = checkApartment.mk_price;
      mk_price_usd = checkApartment.mk_price * usdRate.rate_value;
    } else {
      deal_price = createOrderDto.price;
      initial_pay = createOrderDto.initial_pay;
      kv_price_usd = Math.round(
        Number(createOrderDto.price) / Number(usdRate.rate_value),
      );
      kv_price = createOrderDto.price;
      mk_price = checkApartment.mk_price;
      mk_price_usd = checkApartment.mk_price / usdRate.rate_value;
    }

    // const initial_floored = Math.floor(initial_pay / 1000 ) *1000;
    const initial_floored = initial_pay;

    const order = new Orders();
    // order.clients = await Clients.findOne({
    //   where: { id: +createOrderDto.client_id },
    // });
    order.client_id = createOrderDto.client_id;
    order.paymentMethods = payment_method;
    order.order_status = createOrderDto.order_status;
    order.percent = createOrderDto.percent;
    order.order_date = createOrderDto.order_date;
    order.initial_pay = initial_floored;
    order.currency_value = usdRate.rate_value;
    order.users = await Users.findOne({ where: { id: users.userId } });
    order.quantity = 1;
    order.delivery_time = createOrderDto.delivery_time;
    const savedOrder = await this.ordersRepository.save(order);

    const apartment = await Apartments.findOne({
      where: { id: createOrderDto.apartment_id },
      relations: ['floor.entrance.buildings'],
    });

    // binodagi barcha apartmentlarga tegishli narxini olish

    const total = deal_price
      ? deal_price * apartment.room_space
      : apartment.floor.entrance.buildings.mk_price * apartment.room_space;

    console.log(
      deal_price +
        '-' +
        apartment.room_space +
        '/' +
        apartment.floor.entrance.buildings.mk_price,
    );

    // const total_floored = Math.floor(total / 1000) * 1000
    const total_floored = total;
    let schedule;

    if (
      payment_method.name_alias.toLowerCase() === 'subsidia' ||
      payment_method.name_alias.toLowerCase() === 'ipoteka'
    ) {
      // umumiy qiymatni to'lov muddatiga bo'lgandagi bir oylik to'lov

      const oneMonthDue = createOrderDto.initial_pay
        ? Math.round(
            Number(total - createOrderDto.initial_pay) /
              Number(createOrderDto.installment_month),
          )
        : Math.round(Number(total) / Number(createOrderDto.installment_month));

      const creditSchedule = [];
      const date = new Date();

      for (let i = 1; i <= createOrderDto.installment_month; i++) {
        const mon = new Date(date.setMonth(date.getMonth() + 1));

        const installment = new CreditTable();
        installment.orders = savedOrder;
        installment.due_amount = oneMonthDue;
        installment.due_date = mon;
        installment.left_amount = 0;
        installment.usd_due_amount =
          installment.due_amount / usdRate.rate_value;
        installment.currency_value = usdRate.rate_value;
        installment.status = 'waiting';
        creditSchedule.push(installment);
      }

      schedule = await CreditTable.save(creditSchedule);
    }

    const total_in_usd = total / usdRate.rate_value;

    const updatedOrder = await this.ordersRepository.update(
      { id: savedOrder.id },
      {
        total_amount: total_floored,
        total_amount_usd: total_in_usd,
        order_status:
          total_floored == initial_floored
            ? OrderStatus.COMPLETED
            : OrderStatus.ACTIVE,
      },
    );

    const orderItem = new OrderItems();
    orderItem.orders = savedOrder;
    orderItem.apartments = await Apartments.findOne({
      where: { id: +createOrderDto.apartment_id },
    });
    orderItem.price = kv_price;
    orderItem.price_usd = kv_price_usd;
    orderItem.final_price = total_floored;
    orderItem.mk_price = mk_price;
    orderItem.mk_price_usd = mk_price_usd;
    orderItem.order_status = createOrderDto.order_status;
    await Apartments.update(
      { id: createOrderDto.apartment_id },
      { status: ApartmentStatus.SOLD },
    );

    const inBooking = await Booking.findOne({
      where: { apartment_id: createOrderDto.apartment_id },
    });

    if (inBooking) {
      await Booking.update({ id: inBooking.id }, { bron_is_active: false });
    }

    await OrderItems.save(orderItem);

    const payment = new Payments();
    payment.order_id = +savedOrder.id;
    payment.users = savedOrder.users;
    payment.amount = savedOrder.initial_pay;
    payment.payment_date = new Date();
    payment.paymentmethods = Paymentmethods.CASH;
    payment.caishers = await Caisher.findOne({
      where: { id: createOrderDto.caisher_id, is_active: true },
    });
    payment.amount_usd = savedOrder.initial_pay / usdRate.rate_value;
    payment.currency_value = usdRate.rate_value;
    payment.caisher_type = Caishertype.IN;
    payment.payment_status = PaymentStatus.PAID;
    payment.pay_note = "Boshlangich to'lov";

    await Payments.save(payment);

    return updatedOrder;
  }

  // ===================== active shartnomalar ro'yxatini olish =============================

  async getActiveOrdersList(id: number, user_id: any) {
    let order;
    if (id == 0) {
      order = await this.ordersRepository.find({
        where: {
          order_status: In([OrderStatus.ACTIVE, OrderStatus.COMPLETED]),
        },
        order: { id: 'desc', order_status: 'ASC' },
        relations: [
          'clients',
          'users',
          'payments',
          'paymentMethods',
          'orderItems.apartments.floor.entrance.buildings.towns',
        ],
      });

      order.forEach((orderItem) => {
        orderItem.total_amount = Math.round(Number(orderItem.total_amount));
        const sumOfPayments = orderItem.payments.reduce(
          (accumulator, currentPayment) => accumulator + +currentPayment.amount,
          0,
        );
        orderItem.sumOfpayments = sumOfPayments ? sumOfPayments : 0;
      });
    } else {
      order = await this.ordersRepository.findOne({
        where: { id: id },
        order: { id: 'desc', order_status: 'ASC' },
        relations: ['clients', 'payments', 'users', 'paymentMethods'],
      });

      const sum = order['payments'].reduce(
        (accumulator, currentValue) =>
          accumulator + Number(currentValue.amount),
        0,
      );
      order['sumOfpayments'] = sum ? sum : 0;
    }
    return order;
  }

  //=========================== apartment_id berilsa shu aydi boglangan orderni olib kelib beradi ==================================

  async findOrderByApartmentID(id: number) {
    const order = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.apartments', 'apartment')
      .leftJoinAndSelect('order.clients', 'clients')
      .leftJoinAndSelect('order.paymentMethods', 'paymentMethod')
      .leftJoinAndSelect('order.payments', 'payment')
      .leftJoinAndSelect('order.users', 'users')
      .where('orderItems.apartment_id = :id', { id })
      // .andWhere('orderItems.order_status= :status', {
      //   status: OrderStatus.ACTIVE,
      // })
      .andWhere('orderItems.order_status IN(:...status)', {
        status: [OrderStatus.COMPLETED, OrderStatus.ACTIVE],
      })
      .andWhere('order.order_status IN(:...status)', {
        status: [OrderStatus.COMPLETED, OrderStatus.ACTIVE],
      })
      .getOne();

    if (order) {
      const sumOfPayments = order.payments.reduce(
        (accumulator, currentPayment) => accumulator + +currentPayment.amount,
        0,
      );
      order['sumOfpayments'] = sumOfPayments ? Math.floor(sumOfPayments) : 0;
    }
    return order;
  }

  async getOrderListIsDue(refundDto: RefundDto) {
    let activeness;
    if (refundDto.is_refunding) {
      activeness = OrderStatus.INACTIVE;
    } else {
      activeness = OrderStatus.ACTIVE;
    }
    const result = [];
    const orders = await this.ordersRepository
      .createQueryBuilder('orders')
      .addSelect('orders.id')
      .addSelect('orders.order_date')
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id=orders.client_id',
      )
      .leftJoinAndSelect(
        'orders.payments',
        'payments',
        'payments.order_id=orders.id',
      )
      .where('orders.order_status =:logic', { logic: activeness })
      .getMany();

    orders.forEach((data) => {
      if (refundDto.is_refunding) {
        const { incomingSum, outgoingSum } = data.payments.reduce(
          (accumulator, currentValue) => {
            currentValue.caisher_type === 'in'
              ? (accumulator.incomingSum += +currentValue.amount)
              : (accumulator.outgoingSum += +currentValue.amount);
            return accumulator;
          },
          { incomingSum: 0, outgoingSum: 0 },
        );

        result.push({
          order_id: data.id,
          order_date: data.order_date,
          clients: data.clients.first_name + ' ' + data.clients.last_name,
          left_amount: incomingSum - outgoingSum,
          order_status: data.order_status,
        });
      } else {
        const sum = data.payments.reduce((accumulator, currentValue) => {
          return accumulator + +currentValue.amount;
        }, 0);

        result.push({
          order_id: data.id,
          order_date: data.order_date,
          clients: data.clients.first_name + ' ' + data.clients.last_name,
          totalsum: Math.floor(data.total_amount - sum),
          order_status: data.order_status,
        });

        console.log(data.total_amount + '-----' + sum);
      }
    });
    return result;
  }

  // =================== shartnomani tahrirlash ==================================

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto, users: any) {
    //shartnoma tuziliyotgan vaqtdagi dollar kursi
    const usdRate = await ExchangRates.findOne({ where: { is_default: true } });
    const payment_method = await PaymentMethods.findOne({
      where: { id: +updateOrderDto.payment_method_id },
    });
    const checkApartment = await Apartments.findOne({
      where: { id: +updateOrderDto.apartment_id },
    });
    if (
      checkApartment.status === ApartmentStatus.SOLD ||
      checkApartment.status === ApartmentStatus.INACTIVE
    ) {
      throw new HttpException(
        'Xonadon allaqachon sotilgan',
        HttpStatus.BAD_REQUEST,
      );
    }

    let initial_pay, deal_price, kv_price_usd, kv_price, mk_price, mk_price_usd;

    if (payment_method.name_alias === 'dollar') {
      deal_price = updateOrderDto.price * usdRate.rate_value;
      initial_pay = updateOrderDto.initial_pay * usdRate.rate_value;
      kv_price = updateOrderDto.price * usdRate.rate_value;
      kv_price_usd = Math.round(Number(updateOrderDto.price));
      mk_price = checkApartment.mk_price;
      mk_price_usd = checkApartment.mk_price * usdRate.rate_value;
    } else {
      deal_price = updateOrderDto.price;
      initial_pay = updateOrderDto.initial_pay;
      kv_price_usd = Math.round(
        Number(updateOrderDto.price) / Number(usdRate.rate_value),
      );
      kv_price = updateOrderDto.price;
      mk_price = checkApartment.mk_price;
      mk_price_usd = checkApartment.mk_price / usdRate.rate_value;
    }

    // const initial_floored = Math.floor(initial_pay / 1000 ) *1000;
    const initial_floored = initial_pay;

    const order = new Orders();
    // order.clients = await Clients.findOne({
    //   where: { id: +createOrderDto.client_id },
    // });
    order.client_id = updateOrderDto.client_id;
    order.paymentMethods = payment_method;
    order.order_status = updateOrderDto.order_status;
    order.percent = updateOrderDto.percent;
    order.order_date = updateOrderDto.order_date;
    order.initial_pay = initial_floored;
    order.currency_value = usdRate.rate_value;
    order.users = await Users.findOne({ where: { id: users.userId } });
    order.quantity = 1;
    order.delivery_time = updateOrderDto.delivery_time;
    const savedOrder = await this.ordersRepository.save(order);

    const apartment = await Apartments.findOne({
      where: { id: updateOrderDto.apartment_id },
      relations: ['floor.entrance.buildings'],
    });

    // binodagi barcha apartmentlarga tegishli narxini olish

    const total = deal_price
      ? deal_price * apartment.room_space
      : apartment.floor.entrance.buildings.mk_price * apartment.room_space;

    console.log(
      deal_price +
        '-' +
        apartment.room_space +
        '/' +
        apartment.floor.entrance.buildings.mk_price,
    );

    // const total_floored = Math.floor(total / 1000) * 1000
    const total_floored = total;
    let schedule;

    if (
      payment_method.name_alias.toLowerCase() === 'subsidia' ||
      payment_method.name_alias.toLowerCase() === 'ipoteka'
    ) {
      // umumiy qiymatni to'lov muddatiga bo'lgandagi bir oylik to'lov

      const oneMonthDue = updateOrderDto.initial_pay
        ? (total - updateOrderDto.initial_pay) /
          updateOrderDto.installment_month
        : total / updateOrderDto.installment_month;

      const creditSchedule = [];
      const date = new Date();

      for (let i = 1; i <= updateOrderDto.installment_month; i++) {
        const mon = new Date(date.setMonth(date.getMonth() + 1));

        const installment = new CreditTable();
        installment.orders = savedOrder;
        installment.due_amount = oneMonthDue;
        installment.due_date = mon;
        installment.left_amount = 0;
        installment.usd_due_amount =
          installment.due_amount / usdRate.rate_value;
        installment.currency_value = usdRate.rate_value;
        installment.status = 'waiting';
        creditSchedule.push(installment);
      }

      schedule = await CreditTable.save(creditSchedule);
    }

    const total_in_usd = total / usdRate.rate_value;

    const updatedOrder = await this.ordersRepository.update(
      { id: savedOrder.id },
      {
        total_amount: total_floored,
        total_amount_usd: total_in_usd,
        order_status:
          total_floored == initial_floored
            ? OrderStatus.COMPLETED
            : OrderStatus.ACTIVE,
      },
    );

    const orderItem = new OrderItems();
    orderItem.orders = savedOrder;
    orderItem.apartments = await Apartments.findOne({
      where: { id: +updateOrderDto.apartment_id },
    });
    orderItem.price = kv_price;
    orderItem.price_usd = kv_price_usd;
    orderItem.final_price = total_floored;
    orderItem.mk_price = mk_price;
    orderItem.mk_price_usd = mk_price_usd;
    await Apartments.update(
      { id: updateOrderDto.apartment_id },
      { status: ApartmentStatus.SOLD },
    );

    const inBooking = await Booking.findOne({
      where: { apartment_id: updateOrderDto.apartment_id },
    });

    if (inBooking) {
      await Booking.update({ id: inBooking.id }, { bron_is_active: false });
    }

    await OrderItems.save(orderItem);

    const payment = new Payments();
    payment.order_id = +savedOrder.id;
    payment.users = savedOrder.users;
    payment.amount = savedOrder.initial_pay;
    payment.payment_date = new Date();
    payment.paymentmethods = Paymentmethods.CASH;
    payment.caishers = await Caisher.findOne({
      where: { id: updateOrderDto.caisher_id, is_active: true },
    });
    payment.amount_usd = savedOrder.initial_pay / usdRate.rate_value;
    payment.currency_value = usdRate.rate_value;
    payment.caisher_type = Caishertype.IN;
    payment.payment_status = PaymentStatus.PAID;
    payment.pay_note = "Boshlangich to'lov";

    await Payments.save(payment);

    return updatedOrder;
  }

  // async updateOrder(id: number, updateOrderDto: UpdateOrderDto) {
  //   const order = await this.ordersRepository.update(
  //     { id: id },
  //     updateOrderDto,
  //   );
  //   return order;
  // }

  // ============= shartnomalarni o'chirish ========================================

  async deleteOrder(arrayOfId: number[]) {
    let conteiner: number;

    for (const val of arrayOfId) {
      const temp = await this.ordersRepository.update(
        { id: val },
        { is_deleted: true },
      );
      conteiner += temp.affected;
    }
    return conteiner;
  }

  // =============== shartnomalarni bekor qilish =====================================

  public async orderReject(arrayOfId: number[]) {
    let order,
      orderItem,
      counter = 0;

    try {
      for (const val of arrayOfId) {
        await this.ordersRepository.update(
          { id: val },
          { order_status: OrderStatus.INACTIVE },
        );

        order = await this.ordersRepository.findOne({ where: { id: val } });
        await this.ordersRepository.manager
          .getRepository(OrderItems)
          .update(
            { order_id: order.id },
            { order_status: OrderStatus.INACTIVE },
          );
        orderItem = await this.ordersRepository.manager
          .createQueryBuilder(OrderItems, 'orderItems')
          .leftJoin(
            'orderItems.apartments',
            'apartments',
            'apartments.id=orderItems.apartment_id',
          )
          .leftJoin('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
          .leftJoin(
            'floor.entrance',
            'entrance',
            'entrance.id=floor.entrance_id',
          )
          .leftJoin(
            'entrance.buildings',
            'buildings',
            'entrance.building_id=buildings.id',
          )
          .leftJoin(
            'buildings.buildingItems',
            'buildingItems',
            'buildingItems.building_id=buildings.id',
          )
          .select([
            'apartments.id as apartment_id',
            'buildings.id as building_id',
            'buildingItems.mk_price as mk_price',
          ])
          .where('orderItems.order_id= :order_id', { order_id: order.id })
          .andWhere('buildingItems.is_active= :is_active', { is_active: true })
          .getRawOne();

        counter += (
          await Apartments.update(
            { id: orderItem.apartment_id },
            { status: ApartmentStatus.FREE, mk_price: orderItem.mk_price },
          )
        ).affected;

        // await BuildingItems.update({ building_id: orderItem.building_id, is_active: true },{ mk_price: building_price.mk_price});
      }

      if (counter === arrayOfId.length) {
        return { success: true, message: 'Orders cancelled  completely' };
      } else if (counter < arrayOfId.length) {
        return { success: true, message: 'Orders cancelled partially' };
      } else {
        return { success: false, message: 'Orders not found' };
      }
    } catch (error) {
      return { status: error.code, message: error.message };
    }
  }

  // ======================== bekor qilingan shartnomalar ro'yxatini olish =================

  async findRejectedOrders(id: number) {
    let cancelledOrders;

    if (id > 0) {
      cancelledOrders = await this.ordersRepository.findOne({
        where: {
          order_status: In([OrderStatus.INACTIVE, OrderStatus.REFUNDED]),
          id: id,
        },
        relations: [
          'clients',
          'payments',
          'users',
          'paymentMethods',
          'orderItems.apartments',
        ],
      });
    } else {
      cancelledOrders = await this.ordersRepository.find({
        where: {
          order_status: In([OrderStatus.INACTIVE, OrderStatus.REFUNDED]),
        },
        order: { order_status: 'ASC', updated_at: 'DESC' },
        relations: [
          'clients',
          'payments',
          'users',
          'paymentMethods',
          'orderItems.apartments',
        ],
      });

      cancelledOrders.forEach((order) => {
        const { incomingSum, outgoingSum } = order.payments.reduce(
          (accumulator, currentValue) => {
            currentValue.caisher_type === 'in'
              ? (accumulator.incomingSum += +currentValue.amount)
              : (accumulator.outgoingSum += +currentValue.amount);
            return accumulator;
          },
          { incomingSum: 0, outgoingSum: 0 },
        );

        //   const sumOfPayments = order.payments.reduce(
        //     (accumulator, currentPayment) => accumulator + (+currentPayment.amount),
        //     0,
        //   );
        order.left_amount =
          incomingSum > outgoingSum ? incomingSum - outgoingSum : 0;
      });
    }

    if (cancelledOrders && cancelledOrders.length) {
      return {
        success: true,
        data: cancelledOrders,
        message: 'Fetched Cancelled Orders',
      };
    } else if (cancelledOrders) {
      return { success: true, data: cancelledOrders, message: 'Fetched data' };
    } else {
      return { success: false, message: 'No data fetched' };
    }
  }

  //============================ jami summasi to'langan shartnomalar ro'yxatini olish ===============================

  async findCompletedOrders(id: number) {
    let result;

    if (id != 0) {
      result = await this.ordersRepository
        .createQueryBuilder('orders')
        .leftJoinAndSelect('orders.clients', 'client')
        .leftJoinAndSelect('orders.users', 'user')
        .leftJoinAndSelect('orders.paymentMethods', 'paymentMethod')
        .leftJoinAndSelect('orders.payments', 'payment')
        .where('orders.order_status = :status', {
          status: OrderStatus.COMPLETED,
        })
        .andWhere('orders.id = :id', { id })
        .orderBy('orders.id', 'DESC')
        .getOne();
    } else {
      result = await this.ordersRepository
        .createQueryBuilder('orders')
        .leftJoinAndSelect('orders.clients', 'client')
        .leftJoinAndSelect('orders.users', 'user')
        .leftJoinAndSelect('orders.paymentMethods', 'paymentMethod')
        .leftJoinAndSelect('orders.payments', 'payment')
        .where('orders.order_status = :status', {
          status: OrderStatus.COMPLETED,
        })
        .orderBy('orders.id', 'DESC')
        .getMany();
    }

    if (result && result.length > 0) {
      return { success: true, data: result, message: 'all completed orders' };
    } else if (result) {
      return { success: true, data: result, message: 'completed order' };
    } else {
      return { success: false, message: 'completed order not found' };
    }
  }

  // async findLeftAmountsOfReturningOrders() {
  //   const result = [];
  //   const orders = await this.ordersRepository
  //     .createQueryBuilder('orders')
  //     .addSelect('orders.id')
  //     .addSelect('orders.order_date')
  //     .leftJoinAndSelect(
  //       'orders.clients',
  //       'clients',
  //       'clients.id=orders.client_id')
  //     .leftJoinAndSelect(
  //       'orders.payments',
  //       'payments',
  //       'payments.order_id=orders.id',
  //     )
  //     .where('orders.order_status =:logic', { logic: OrderStatus.INACTIVE })
  //     .getMany();

  //     orders.forEach((data) => {
  //       const { incomingSum, outgoingSum } = data.payments.reduce(
  //         (accumulator, currentValue) => {

  //           currentValue.caisher_type === 'in' ? accumulator.incomingSum += +currentValue.amount : accumulator.outgoingSum += +currentValue.amount

  //           return accumulator;
  //         },
  //         { incomingSum: 0, outgoingSum: 0 });

  //       result.push({
  //         order_id: data.id,
  //         order_date: data.order_date,
  //         clients: data.clients.first_name + ' ' + data.clients.last_name,
  //         left_amount: incomingSum - outgoingSum,
  //       });
  //     });

  //   return result;
  // }
}
