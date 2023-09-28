import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
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

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Orders)
    private readonly ordersRepository: Repository<Orders>,
    private readonly paymentService: PaymentsService,
  ) {}

  //==================== yangi qo'shiladigan shartnima raqani ===========================

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

    const order = new Orders();
    order.clients = await Clients.findOne({
      where: { id: +createOrderDto.client_id },
    });
    order.paymentMethods = payment_method;
    order.order_status = createOrderDto.order_status;
    order.order_date = new Date();
    order.initial_pay = createOrderDto.initial_pay;
    order.currency_value = usdRate.rate_value;
    order.users = await Users.findOne({ where: { id: users.userId } });
    order.quantity = 1;

    const savedOrder = await this.ordersRepository.save(order);

    const apartment = await Apartments.findOne({
      where: { id: createOrderDto.apartment_id },
      relations: ['floor.entrance.buildings'],
    });

    // binodagi barcha apartmentlarga tegishli narxini olish

    const total = createOrderDto.price
      ? createOrderDto.price * apartment.room_space
      : apartment.floor.entrance.buildings.mk_price * apartment.room_space;

    let schedule;

    if (
      payment_method.name_alias.toLowerCase() === 'rassrochka' ||
      payment_method.name_alias.toLowerCase() === 'ipoteka'
    ) {
      // umumiy qiymatni to'lov muddatiga bo'lgandagi bir oylik to'lov

      const oneMonthDue = createOrderDto.initial_pay
        ? (total - createOrderDto.initial_pay) /
          createOrderDto.installment_month
        : total / createOrderDto.installment_month;

      const creditSchedule = [];
      const date = new Date();

      for (let i = 1; i <= createOrderDto.installment_month; i++) {
        const mon = new Date(date.setMonth(date.getMonth() + 1));

        const installment = new CreditTable();
        installment.orders = savedOrder;
        installment.due_amount = +oneMonthDue.toFixed(2);
        installment.due_date = mon;
        installment.left_amount = 0;
        installment.status = 'waiting';
        creditSchedule.push(installment);
      }

      schedule = await CreditTable.save(creditSchedule);
    }

    const total_in_usd = +(total / usdRate.rate_value).toFixed(2);

    const updatedOrder = await this.ordersRepository.update(
      { id: savedOrder.id },
      { total_amount: total, total_amount_usd: total_in_usd },
    );

    const orderItem = new OrderItems();
    orderItem.orders = savedOrder;
    orderItem.apartments = await Apartments.findOne({
      where: { id: +createOrderDto.apartment_id },
    });
    orderItem.final_price = total;

    await Apartments.update(
      { id: createOrderDto.apartment_id },
      { status: ApartmentStatus.SOLD },
    );

    let apr;
    apr = await Apartments.findOne({
      where: { id: createOrderDto.apartment_id },
    });
    const inBooking = await Booking.findOne({ where: { apartments: apr } });

    if (inBooking) {
      inBooking.bron_is_active = false;
      await Booking.save(inBooking);
    }

    await OrderItems.save(orderItem);

    const payment = new Payments();
    payment.orders = await Orders.findOne({ where: { id: +savedOrder.id } });
    payment.users = savedOrder.users;
    payment.amount = savedOrder.initial_pay;
    payment.payment_date = new Date();
    payment.paymentmethods = Paymentmethods.CARD;
    payment.caishers = await Caisher.findOne({
      where: { is_active: true, is_default: true },
    });
    payment.amount_usd = +(savedOrder.initial_pay / usdRate.rate_value).toFixed(
      2,
    );
    payment.currency_value = usdRate.rate_value;
    payment.caisher_type = Caishertype.IN;
    payment.payment_status = PaymentStatus.PAID;
    payment.pay_note = "Boshlangich to'lov";

    await Payments.save(payment);

    return updatedOrder;
  }

  // ===================== active shartnomalar ro'yxatini olish =============================

  async getActiveOrdersList(id: number, user_id: Users) {
    let order;
    if (id == 0) {
      order = await this.ordersRepository.find({
        where: { order_status: OrderStatus.ACTIVE },
        relations: [
          'clients',
          'users',
          'payments',
          'paymentMethods',
          'orderItems.apartments.floor.entrance.buildings.towns',
        ],
      });

      order.forEach((orderItem) => {
        orderItem.total_amount = +orderItem.total_amount;
        const sumOfPayments = orderItem.payments.reduce(
          (accumulator, currentPayment) => accumulator + +currentPayment.amount,
          0,
        );
        orderItem.sumOfpayments = sumOfPayments ? +sumOfPayments.toFixed(2) : 0;
      });
    } else {
      order = await this.ordersRepository.findOne({
        where: { id: id },
        relations: [
          'clients',
          'payments',
          'users',
          'paymentMethods',
          'orderItems.apartments.floor.entrance.buildings.towns',
        ],
      });

      const sum = order['payments'].reduce(
        (accumulator, currentValue) => accumulator + +currentValue.amount,
        0,
      );
      order['payments'] = +sum.toFixed(2);
    }
    return order;
  }

  //================================================================================================

  async getAppartmenOrderList(id: number) {
    let order, apartments;
    apartments = Apartments.findOne({
      where: { id: id },
      relations: ['orderItems.orders'],
    });

    console.log(JSON.stringify(apartments)+' '+ id);
    // orderItems = OrderItems.findOne({ where: { apartments: apartments } });
    order = await this.ordersRepository.find({
      where: { id: apartments.orderItems },
      relations: [
        'orderItems',
        'clients',
        'payments',
        'orderItems.apartments.floor.entrance.buildings.towns',
      ],
    });
    order.forEach((orderItem) => {
      const sumOfPayments = orderItem.payments.reduce(
        (accumulator, currentPayment) => accumulator + +currentPayment.amount,
        0,
      );
      orderItem.sumOfpayments = sumOfPayments ? +sumOfPayments.toFixed(2) : 0;
    });

    return order;
  }

  async getOrderListIsDue() {
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
      .where('orders.order_status =:logic', { logic: OrderStatus.ACTIVE })
      .getMany();

    orders.forEach((data, key) => {
      const sum = data.payments.reduce((accumulator, currentValue) => {
        return accumulator + +currentValue.amount;
      }, 1);
      result.push({
        order_id: data.id,
        order_date: data.order_date,
        clients: data.clients.first_name + ' ' + data.clients.last_name,
        totalsum: +(data.total_amount - sum),
      });
    });
    return result;
  }

  // =================== shartnomani tahrirlash ==================================

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.ordersRepository.update(
      { id: id },
      updateOrderDto,
    );
    return order;
  }

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

        orderItem = await OrderItems.findOne({ where: { orders: order } });
        counter += (
          await Apartments.update(
            { id: orderItem },
            { status: ApartmentStatus.FREE },
          )
        ).affected;
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
        where: { order_status: OrderStatus.INACTIVE, id: id },
        relations: [
          'clients',
          'payments',
          'users',
          'paymentMethods',
          'orderItems.apartments.floor.entrance.buildings.towns',
        ],
      });
    } else {
      cancelledOrders = await this.ordersRepository.find({
        where: { order_status: OrderStatus.INACTIVE },
        relations: [
          'clients',
          'payments',
          'users',
          'paymentMethods',
          'orderItems.apartments.floor.entrance.buildings.towns',
        ],
      });

      cancelledOrders.forEach((orderItem) => {
        orderItem.total_amount = +orderItem.total_amount;
        const sumOfPayments = orderItem.payments.reduce(
          (accumulator, currentPayment) => accumulator + +currentPayment.amount,
          0,
        );
        orderItem.sumOfpayments = sumOfPayments ? +sumOfPayments.toFixed(2) : 0;
      });

      cancelledOrders.forEach((order) => {
        const sumOfPayments = order.payments.reduce(
          (accumulator, currentPayment) => accumulator + +currentPayment.amount,
          0,
        );
        order.sumOfPayments = sumOfPayments ? +sumOfPayments.toFixed(2) : 0;
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
}
