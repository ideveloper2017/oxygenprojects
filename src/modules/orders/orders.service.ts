import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager, In, QueryRunner, Repository } from 'typeorm';
import { Orders } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentMethods } from '../payment-method/entities/payment-method.entity';
import { OrderItems } from '../order-items/entities/order-item.entity';
import { Apartments } from '../apartments/entities/apartment.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
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
import { TransferOrderDto } from './dto/tramsfer-order.dto';
import { ReCreateOrderDto } from './dto/recreate-order.dto';
import { ReCreateOrderFreeAppDto } from './dto/ReCreateOrderFreeApp.dto';
import { ExchangeclientDto } from './dto/exchangeclient.dto';
import { SwapApartmentsDto } from './dto/swap-apartments.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Orders)
    private readonly ordersRepository: Repository<Orders>,
    @InjectRepository(Payments)
    private readonly paymentRepository: Repository<Payments>,
    private readonly paymentService: PaymentsService,
  ) {}

  //==================== yangi qo'shiladigan shartnima raqami ===========================

  async getLastID(building_id: number) {
    return await this.ordersRepository.manager
      .getRepository(OrderItems)
      .createQueryBuilder('orderItems')
      .leftJoinAndSelect('orderItems.orders', 'orders')
      .leftJoinAndSelect('orderItems.apartments', 'apartments')
      .leftJoinAndSelect('apartments.floor', 'floor')
      .leftJoinAndSelect('floor.entrance', 'entrance')
      .leftJoinAndSelect('entrance.buildings', 'buildings')
      .where('buildings.id = :building_id', { building_id })
      .andWhere('orders.order_status=:order_status', {
        order_status: OrderStatus.ACTIVE,
      })
      .orderBy('orders.contract_number', 'DESC')
      .getOne();
  }

  // =================== Yangi shartnoma tuzisha ===================================//
  async createOrder(createOrderDto: CreateOrderDto, users: any) {
    //shartnoma tuziliyotgan vaqtdagi dollar kursi
    // const usdRate = await ExchangRates.findOne({ where: { is_default: true } });
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
    if (
      payment_method.name_alias === 'dollar' ||
      payment_method.name_alias === 'nasiya_dollar'
    ) {
      deal_price = Math.round(
        Number(createOrderDto.price) * Number(createOrderDto.currency_value),
      );
      initial_pay = Math.round(
        Number(createOrderDto.initial_pay) *
          Number(createOrderDto.currency_value),
      );
      kv_price = Math.round(
        Number(createOrderDto.price) * Number(createOrderDto.currency_value),
      );
      kv_price_usd = Math.round(Number(createOrderDto.price));
      mk_price = Math.round(Number(checkApartment.mk_price));
      mk_price_usd = Math.round(
        Number(checkApartment.mk_price) / Number(createOrderDto.currency_value),
      );
    } else {
      deal_price = Math.round(createOrderDto.price);
      initial_pay = Math.round(createOrderDto.initial_pay);
      kv_price_usd = Math.round(
        Number(createOrderDto.price) / Number(createOrderDto.currency_value),
      );
      kv_price = Math.round(createOrderDto.price);
      mk_price = Math.round(checkApartment.mk_price);
      mk_price_usd = Math.round(
        Number(checkApartment.mk_price) / Number(createOrderDto.currency_value),
      );
    }

    const contractnumber: string = createOrderDto.contractNum;
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
    order.currency_value = createOrderDto.currency_value;
    order.users = await Users.findOne({ where: { id: users.userId } });
    order.quantity = 1;
    order.contract_number = contractnumber;
    order.delivery_time = createOrderDto.delivery_time;
    order.initial_month = +createOrderDto.installment_month;
    const savedOrder = await this.ordersRepository.save(order);
    const apartment = await Apartments.findOne({
      where: { id: createOrderDto.apartment_id },
      relations: ['floor.entrance.buildings'],
    });

    // binodagi barcha apartmentlarga tegishli narxini olish
    const total = deal_price
      ? Math.round(deal_price * apartment.room_space)
      : Math.round(
          apartment.floor.entrance.buildings.mk_price * apartment.room_space,
        );

    // const total_floored = Math.floor(total / 1000) * 1000
    const total_floored = total;
    let schedule;

    if (
      payment_method.name_alias === 'subsidia' ||
      payment_method.name_alias === 'ipoteka' ||
      payment_method.name_alias === 'nasiya_naqd' ||
      payment_method.name_alias === 'nasiya_dollar'
    ) {
      // umumiy qiymatni to'lov muddatiga bo'lgandagi bir oylik to'lov
      const oneMonthDue = Math.round(Number(createOrderDto.initial_pay))
        ? Math.round(
            payment_method.name_alias === 'nasiya_dollar'
              ? (Number(total) -
                  Number(createOrderDto.initial_pay) *
                    Number(createOrderDto.currency_value)) /
                  Number(createOrderDto.installment_month)
              : (Number(total) - Number(createOrderDto.initial_pay)) /
                  Number(createOrderDto.installment_month),
          )
        : Math.round(Number(total) / Number(createOrderDto.installment_month));
      const creditSchedule = [];

      for (let i = 1; i <= createOrderDto.installment_month; i++) {
        //const mon = createOrderDto.order_date
        const baseDate = new Date(createOrderDto.order_date);
        const mon = new Date(baseDate.setMonth(baseDate.getMonth() + i));
        const installment = new CreditTable();
        installment.orders = savedOrder;
        installment.due_amount = oneMonthDue;
        installment.due_date = mon;
        installment.left_amount = 0;
        installment.paid_amount = 0;
        installment.usd_due_amount = Math.round(
          Number(installment.due_amount / createOrderDto.currency_value),
        );
        installment.currency_value = createOrderDto.currency_value;
        installment.status = 'waiting';
        creditSchedule.push(installment);
      }
      schedule = await CreditTable.save(creditSchedule);
    }

    const updatedOrder = await this.ordersRepository.update(
      { id: savedOrder.id },
      {
        total_amount: Math.round(total_floored),
        total_amount_usd: Math.round(
          Number(total) / Number(createOrderDto.currency_value),
        ),
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
    payment.payment_date = createOrderDto.order_date;
    payment.paymentmethods = Paymentmethods.CASH;
    payment.caishers = await Caisher.findOne({
      where: { id: createOrderDto.caisher_id, is_active: true },
    });
    payment.amount_usd = savedOrder.initial_pay / createOrderDto.currency_value;
    payment.currency_value = createOrderDto.currency_value;
    payment.caisher_type = Caishertype.IN;
    payment.payment_status = PaymentStatus.PAID;
    payment.pay_note = "Boshlangich to'lov";

    await Payments.save(payment);

    return updatedOrder;
  }

  async exchangeClient(updateOrderDto: ExchangeclientDto, users: any) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: updateOrderDto.order_id,
        client_id: updateOrderDto.client_id,
      },
      relations: [
        'orderItems.apartments',
        'payments',
        'clients',
        'paymentMethods',
      ],
    });
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }
    const newOrder = await this.ordersRepository.findOne({
      where: {
        id: updateOrderDto.new_order_id,
        client_id: updateOrderDto.new_client_id,
      },
      relations: [
        'orderItems.apartments',
        'payments',
        'clients',
        'paymentMethods',
      ],
    });

    const apartment = await Apartments.findOne({
      where: { id: order.orderItems?.[0].apartment_id },
    });

    const newapartment = await Apartments.findOne({
      where: { id: newOrder.orderItems?.[0].apartment_id },
    });

    const price = order.orderItems?.[0].price || 0;
    const room_space = order.orderItems?.[0].apartments?.room_space || 0;
    const summa_in =
      order?.payments
        ?.filter((payment) => payment.caisher_type === 'in')
        ?.reduce(
          (acc, payment) => acc + Math.round(Number(payment.amount)),
          0,
        ) || 0;
    const summa_out =
      order?.payments
        ?.filter((payment) => payment.caisher_type === 'out')
        ?.reduce(
          (acc, payment) => acc + Math.round(Number(payment.amount)),
          0,
        ) || 0;
    const new_price = newOrder.orderItems?.[0].price || 0;
    const new_room_space = newOrder.orderItems?.[0].apartments?.room_space || 0;
    const new_paid_summa =
      newOrder?.payments
        ?.filter((payment) => payment.caisher_type === 'in')
        ?.reduce(
          (acc, payment) => acc + Math.round(Number(payment.amount)),
          0,
        ) || 0;

    Orders.update(
      { id: updateOrderDto.order_id },
      {
        total_amount: new_room_space * new_price,
        client_id: newOrder.clients?.id,
        payment_method_id: newOrder.paymentMethods?.id,
      },
    );
    Orders.update(
      { id: updateOrderDto.new_order_id },
      {
        total_amount: room_space * price,
        client_id: order.clients?.id,
        payment_method_id: order.paymentMethods?.id,
      },
    );

    // OrderItems.update(
    //   { order_id: updateOrderDto.order_id },
    //   {
    //     price: new_price,
    //     apartment_id: newapartment.id,
    //   },
    // );
    //
    // OrderItems.update(
    //   { order_id: updateOrderDto.new_order_id },
    //   { price: price, apartment_id: apartment.id },
    // );

    const orderItem = await OrderItems.findOne({
      where: { order_id: updateOrderDto.order_id },
    });
    const newOrderItem = await OrderItems.findOne({
      where: { order_id: updateOrderDto.new_order_id },
    });

    const changeOrder = await Orders.findOne({
      where: {
        id: updateOrderDto.order_id,
        client_id: updateOrderDto.new_client_id,
      },
    });

    const newchangeOrder = await Orders.findOne({
      where: {
        id: updateOrderDto.new_order_id,
        client_id: updateOrderDto.client_id,
      },
    });

    await OrderItems.update(
      { id: orderItem.id },
      {
        price: new_price,
        apartment_id: newapartment?.id,
        order_id: newchangeOrder.id,
      },
    );

    await OrderItems.update(
      { id: newOrderItem.id },
      {
        price: price,
        apartment_id: apartment?.id,
        order_id: changeOrder.id,
      },
    );

    for (const payment of order.payments) {
      const newPayment = this.paymentRepository.create({
        ...payment,
        order_id: updateOrderDto.new_order_id,
        created_at: new Date(),
      });
      await this.paymentRepository.save(newPayment);
    }

    // Endi newOrder dagi paymentlar eski orderga ko'chiriladi
    for (const payment of newOrder.payments) {
      const newPayment = this.paymentRepository.create({
        ...payment,
        order_id: updateOrderDto.order_id,
        created_at: new Date(),
      });
      await this.paymentRepository.save(newPayment);
    }

    console.log(
      { id: newOrderItem.id },
      {
        price: price,
        apartment_id: apartment?.id,
        order_id: updateOrderDto.order_id,
      },
      { id: orderItem.id },
      {
        price: new_price,
        apartment_id: newapartment?.id,
        order_id: updateOrderDto.new_order_id,
      },
    );

    const orderDto = {
      order_id: updateOrderDto.order_id,
      client_id: newOrder.clients?.id,
      currency_value: newOrder.currency_value,
      total_amount: newOrder.total_amount,
      price: newOrder?.orderItems?.[0]?.price,
      paid_amount: new_paid_summa,
      paid_amount_usd: Math.round(new_paid_summa / newOrder.currency_value),
      initial_pay: newOrder.initial_pay,
      initial_month: newOrder.initial_month,
      order_date: newOrder.order_date,
      installment_month: newOrder.initial_month,
    };
    await this.reCreateOrder(orderDto, users);

    const orderDto2 = {
      order_id: updateOrderDto.new_order_id,
      client_id: order.clients?.id,
      currency_value: order.currency_value,
      total_amount: order.total_amount,
      price: order?.orderItems?.[0]?.price,
      paid_amount: new_paid_summa,
      paid_amount_usd: Math.round(summa_in / order.currency_value),
      initial_pay: order.initial_pay,
      initial_month: order.initial_month,
      order_date: order.order_date,
      installment_month: order.initial_month,
    };
    await this.reCreateOrder(orderDto2, users);

    // await this.exchangeClientToClient(
    //   {
    //     order_id: updateOrderDto.new_order_id,
    //   },
    //   users,
    // );
    //
    // await this.exchangeClientToClient(
    //   {
    //     order_id: updateOrderDto.order_id,
    //   },
    //   users,
    // );

    return updateOrderDto;
  }

  /**
   * Swaps apartments between two clients including all related data and payments
   * @param swapDto Swap details including order IDs and new apartment IDs
   * @param users Current user performing the action
   */

  async exchangeClientToClient(
    updateOrderDto: {
      order_id: number;
    },
    users: any,
  ) {
    // Find the existing order with necessary relations

    console.log(updateOrderDto);
    const queryRunner =
      this.ordersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Orders, {
        where: {
          id: updateOrderDto.order_id,
          order_status: OrderStatus.ACTIVE,
        },
        relations: ['payments', 'clients', 'paymentMethods'],
      });

      if (!order) {
        throw new HttpException(
          'Bu shartnoma tugatilgan yoki topilmadi!',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Find the order item and apartment
      const orderItem = await OrderItems.findOne({
        where: { order_id: updateOrderDto.order_id },
        relations: ['apartments.floor.entrance.buildings'],
      });

      const checkApartment = await Apartments.findOne({
        where: { id: orderItem.apartments.id },
        relations: ['floor.entrance.buildings'],
      });

      // Calculate prices based on payment method
      const payment_method = await PaymentMethods.findOne({
        where: { id: Number(order.payment_method_id) },
      });

      let initial_pay,
        deal_price,
        kv_price,
        kv_price_usd,
        mk_price,
        mk_price_usd;

      if (
        ['dollar', 'nasiya_dollar'].includes(
          payment_method.name_alias.toLowerCase(),
        )
      ) {
        deal_price = Math.round(
          Number(orderItem.price) * Number(order.currency_value),
        );
        initial_pay = Math.round(
          Number(order.initial_pay) * Number(order.currency_value),
        );
        kv_price = Math.round(
          Number(orderItem.price) * Number(order.currency_value),
        );
        kv_price_usd = Math.round(Number(orderItem.price));
        mk_price = Math.round(Number(checkApartment.mk_price) || 0);
        mk_price_usd = Math.round(
          Number(checkApartment.mk_price || 0) / Number(order.currency_value),
        );
      } else {
        deal_price = Math.round(Number(orderItem.price));
        initial_pay = Math.round(Number(order.initial_pay));
        kv_price_usd = Math.round(
          Number(orderItem.price) / Number(order.currency_value),
        );
        kv_price = Math.round(Number(orderItem.price));
        mk_price = Math.round(Number(orderItem.price) || 0);
        mk_price_usd = Math.round(
          Number(orderItem.price || 0) / Number(order.currency_value),
        );
      }
      const initial_floored = initial_pay;
      const apartment = checkApartment;
      const total = deal_price
        ? deal_price * apartment.room_space
        : orderItem.price * apartment.room_space;
      const total_floored = Math.round(orderItem.price * apartment.room_space);
      const total_in_usd = Math.round(total / order.currency_value);

      // Update order
      const updatedOrder = await this.ordersRepository.update(
        { id: updateOrderDto.order_id },
        {
          client_id: order.client_id,
          payment_method_id: payment_method.id,
          order_status:
            total_floored === initial_floored
              ? OrderStatus.COMPLETED
              : OrderStatus.ACTIVE,
          percent: order.percent,
          order_date: order.order_date,
          total_amount: total_floored,
          total_amount_usd: total_in_usd,
          initial_pay: initial_floored,
          initial_month: order.initial_month || order.initial_month,
          currency_value: order.currency_value,
          user_id: users.userId,

          quantity: 1,
          delivery_time: order.delivery_time,
        },
      );

      // Create credit schedule for specific payment methods
      let schedule;
      if (
        ['subsidia', 'ipoteka', 'nasiya_naqd', 'nasiya_dollar'].includes(
          payment_method.name_alias.toLowerCase(),
        )
      ) {
        const installment_month = order.initial_month;
        const oneMonthDue = initial_floored
          ? Math.round(
              payment_method.name_alias.toLowerCase() === 'nasiya_dollar'
                ? (total_floored - initial_floored) / installment_month
                : (total_floored - initial_floored > 0
                    ? total_floored - initial_floored
                    : total_floored) / installment_month,
            )
          : Math.round(total_floored / installment_month);

        console.time('Fetch existing installments');
        const existingInstallments = await queryRunner.manager.find(
          CreditTable,
          {
            where: { order_id: updateOrderDto.order_id },
            order: { due_date: 'ASC' }, // Consistent ordering
          },
        );
        console.timeEnd('Fetch existing installments');

        // Batch update existing records
        console.time('Batch update');
        const updatePromises: Promise<any>[] = [];
        for (
          let i = 0;
          i < existingInstallments.length && i < installment_month;
          i++
        ) {
          const baseDate = new Date(order.order_date);
          const dueDate = new Date(
            baseDate.setMonth(baseDate.getMonth() + i + 1),
          );

          updatePromises.push(
            CreditTable.update(
              { id: existingInstallments[i].id },
              {
                order_id: updateOrderDto.order_id,
                due_amount: oneMonthDue,
                due_date: dueDate,
                left_amount: 0,
                paid_amount: 0,
                usd_due_amount: Math.round(oneMonthDue / order.currency_value),
                currency_value: order.currency_value,
                status: 'waiting',
              },
            ),
          );
        }
        await Promise.all(updatePromises); // Execute updates concurrently
        console.timeEnd('Batch update');

        // Create new records if needed
        const creditSchedule: CreditTable[] = [];
        for (let i = existingInstallments.length; i < installment_month; i++) {
          const baseDate = new Date(order.order_date);
          const dueDate = new Date(
            baseDate.setMonth(baseDate.getMonth() + i + 1),
          );

          const installment = new CreditTable();
          installment.order_id = updateOrderDto.order_id;
          installment.due_amount = oneMonthDue;
          installment.due_date = dueDate;
          installment.left_amount = 0;
          installment.paid_amount = 0;
          installment.usd_due_amount = Math.round(
            oneMonthDue / order.currency_value,
          );
          installment.currency_value = order.currency_value;
          installment.status = 'waiting';

          creditSchedule.push(installment);
        }

        // Save new records
        if (creditSchedule.length > 0) {
          console.time('Save new installments');
          await CreditTable.save(creditSchedule);
          console.timeEnd('Save new installments');
        }

        // Optionally delete excess records (only if explicitly required)
        if (existingInstallments.length > installment_month) {
          console.warn(
            `Found ${
              existingInstallments.length - installment_month
            } excess records. Deletion skipped to preserve payment schedules.`,
          );
        }
      }

      // Create new order item
      const orderItemData = {
        order_id: updateOrderDto.order_id,
        apartments: checkApartment,
        price: kv_price,
        price_usd: kv_price_usd,
        final_price: total_floored,
        mk_price: mk_price,
        mk_price_usd: mk_price_usd,
      };

      const existingOrderItem = await OrderItems.findOne({
        where: { order_id: updateOrderDto.order_id },
      });

      if (existingOrderItem) {
        await OrderItems.update(
          { order_id: updateOrderDto.order_id },
          orderItemData,
        );
      } else {
        const newOrderItem = new OrderItems();
        Object.assign(newOrderItem, orderItemData);
        await OrderItems.save(newOrderItem);
      }

      // Update apartment status
      await Apartments.update(
        { id: apartment.id },
        { status: ApartmentStatus.SOLD },
      );

      // Update booking status
      const inBooking = await Booking.findOne({
        where: { apartment_id: apartment.id },
      });
      if (inBooking) {
        await Booking.update({ id: inBooking.id }, { bron_is_active: false });
      }

      await this.payForInstallment({
        order_id: updateOrderDto.order_id,
        currency_value: order.currency_value,
        amount: Math.round(Number(order.total_amount - order.initial_pay)),
        paymentmethods: Paymentmethods.CASH,
      });
      await queryRunner.commitTransaction();
      return updatedOrder;
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      return { message: `Transaction failed: ${error}` };
    } finally {
      await queryRunner.release();
    }
  }
  async reChangeOrder(updateOrderDto: ReCreateOrderFreeAppDto, users: any) {
    // Find the existing order with necessary relations

    const queryRunner =
      this.ordersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Orders, {
        where: {
          id: updateOrderDto.order_id,
          order_status: OrderStatus.ACTIVE,
        },
        relations: ['payments', 'clients', 'paymentMethods'],
      });

      if (!order) {
        throw new HttpException(
          'Bu shartnoma tugatilgan yoki topilmadi!',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Find the order item and apartment
      const orderItem = await OrderItems.findOne({
        where: { order_id: updateOrderDto.order_id },
        relations: ['apartments.floor.entrance.buildings'],
      });

      const checkApartment = await Apartments.findOne({
        where: { id: orderItem.apartments.id },
        relations: ['floor.entrance.buildings'],
      });

      if (checkApartment) {
        await Apartments.update(
          { id: orderItem.apartments.id, status: ApartmentStatus.SOLD },
          { status: ApartmentStatus.FREE },
        );
      }

      const newAppartment = await Apartments.findOne({
        where: {
          id: updateOrderDto.apparment_id,
          status: ApartmentStatus.FREE,
        },
        relations: ['floor.entrance.buildings'],
      });

      // Calculate prices based on payment method
      const payment_method = await PaymentMethods.findOne({
        where: { id: Number(order.payment_method_id) },
      });

      let initial_pay,
        deal_price,
        kv_price,
        kv_price_usd,
        mk_price,
        mk_price_usd;

      if (
        ['dollar', 'nasiya_dollar'].includes(
          payment_method.name_alias.toLowerCase(),
        )
      ) {
        deal_price = Math.round(
          Number(orderItem.price) * Number(order.currency_value),
        );
        initial_pay = Math.round(
          Number(order.initial_pay) * Number(order.currency_value),
        );
        kv_price = Math.round(
          Number(orderItem.price) * Number(order.currency_value),
        );
        kv_price_usd = Math.round(Number(orderItem.price));
        mk_price = Math.round(Number(newAppartment.mk_price) || 0);
        mk_price_usd = Math.round(
          Number(newAppartment.mk_price || 0) / Number(order.currency_value),
        );
      } else {
        deal_price = Math.round(Number(orderItem.price));
        initial_pay = Math.round(Number(order.initial_pay));
        kv_price_usd = Math.round(
          Number(orderItem.price) / Number(order.currency_value),
        );
        kv_price = Math.round(Number(orderItem.price));
        mk_price = Math.round(Number(orderItem.price) || 0);
        mk_price_usd = Math.round(
          Number(updateOrderDto.price || 0) / Number(order.currency_value),
        );
      }
      const initial_floored = initial_pay;
      const apartment = newAppartment;
      const total = deal_price
        ? deal_price * apartment.room_space
        : orderItem.price * apartment.room_space;
      const total_floored = Math.round(orderItem.price * apartment.room_space);
      const total_in_usd = Math.round(total / order.currency_value);

      // Update order
      const updatedOrder = await this.ordersRepository.update(
        { id: updateOrderDto.order_id },
        {
          client_id: updateOrderDto.client_id,
          payment_method_id: payment_method.id,
          order_status:
            total_floored === initial_floored
              ? OrderStatus.COMPLETED
              : OrderStatus.ACTIVE,
          percent: order.percent,
          order_date: order.order_date,
          total_amount: total_floored,
          total_amount_usd: total_in_usd,
          initial_pay: initial_floored,
          initial_month: order.initial_month || order.initial_month,
          currency_value: order.currency_value,
          user_id: users.userId,
          contract_number:
            newAppartment?.floor?.entrance?.buildings?.name +
            '/' +
            newAppartment?.room_number +
            '/Д',
          // order.contract_number || order.contract_number,
          quantity: 1,
          delivery_time: order.delivery_time,
        },
      );

      // Create credit schedule for specific payment methods
      let schedule;
      if (
        ['subsidia', 'ipoteka', 'nasiya_naqd', 'nasiya_dollar'].includes(
          payment_method.name_alias.toLowerCase(),
        )
      ) {
        const installment_month = order.initial_month;
        const oneMonthDue = initial_floored
          ? Math.round(
              payment_method.name_alias.toLowerCase() === 'nasiya_dollar'
                ? (total_floored - initial_floored) / installment_month
                : (total_floored - initial_floored > 0
                    ? total_floored - initial_floored
                    : total_floored) / installment_month,
            )
          : Math.round(total_floored / installment_month);

        console.time('Fetch existing installments');
        const existingInstallments = await queryRunner.manager.find(
          CreditTable,
          {
            where: { order_id: updateOrderDto.order_id },
            order: { due_date: 'ASC' }, // Consistent ordering
          },
        );
        console.timeEnd('Fetch existing installments');

        // Batch update existing records
        console.time('Batch update');
        const updatePromises: Promise<any>[] = [];
        for (
          let i = 0;
          i < existingInstallments.length && i < installment_month;
          i++
        ) {
          const baseDate = new Date(order.order_date);
          const dueDate = new Date(
            baseDate.setMonth(baseDate.getMonth() + i + 1),
          );

          updatePromises.push(
            CreditTable.update(
              { id: existingInstallments[i].id },
              {
                order_id: updateOrderDto.order_id,
                due_amount: oneMonthDue,
                due_date: dueDate,
                left_amount: 0,
                paid_amount: 0,
                usd_due_amount: Math.round(oneMonthDue / order.currency_value),
                currency_value: order.currency_value,
                status: 'waiting',
              },
            ),
          );
        }
        await Promise.all(updatePromises); // Execute updates concurrently
        console.timeEnd('Batch update');

        // Create new records if needed
        const creditSchedule: CreditTable[] = [];
        for (let i = existingInstallments.length; i < installment_month; i++) {
          const baseDate = new Date(order.order_date);
          const dueDate = new Date(
            baseDate.setMonth(baseDate.getMonth() + i + 1),
          );

          const installment = new CreditTable();
          installment.order_id = updateOrderDto.order_id;
          installment.due_amount = oneMonthDue;
          installment.due_date = dueDate;
          installment.left_amount = 0;
          installment.paid_amount = 0;
          installment.usd_due_amount = Math.round(
            oneMonthDue / order.currency_value,
          );
          installment.currency_value = order.currency_value;
          installment.status = 'waiting';

          creditSchedule.push(installment);
        }

        // Save new records
        if (creditSchedule.length > 0) {
          console.time('Save new installments');
          await CreditTable.save(creditSchedule);
          console.timeEnd('Save new installments');
        }

        // Optionally delete excess records (only if explicitly required)
        if (existingInstallments.length > installment_month) {
          console.warn(
            `Found ${
              existingInstallments.length - installment_month
            } excess records. Deletion skipped to preserve payment schedules.`,
          );
          // Uncomment the following if you want to delete excess records
          /*
                    const excessIds = existingInstallments
                      .slice(installment_month)
                      .map((inst) => inst.id);
                    console.time('Delete excess records');
                    await queryRunner.manager.delete(CreditTable, { id: In(excessIds) });
                    console.timeEnd('Delete excess records');
                    */
        }
      }

      // Create new order item
      const orderItemData = {
        order_id: updateOrderDto.order_id,
        apartments: newAppartment,
        price: kv_price,
        price_usd: kv_price_usd,
        final_price: total_floored,
        mk_price: mk_price,
        mk_price_usd: mk_price_usd,
      };

      const existingOrderItem = await OrderItems.findOne({
        where: { order_id: updateOrderDto.order_id },
      });

      if (existingOrderItem) {
        await OrderItems.update(
          { order_id: updateOrderDto.order_id },
          orderItemData,
        );
      } else {
        const newOrderItem = new OrderItems();
        Object.assign(newOrderItem, orderItemData);
        await OrderItems.save(newOrderItem);
      }

      // Update apartment status
      await Apartments.update(
        { id: updateOrderDto.apparment_id },
        { status: ApartmentStatus.SOLD },
      );

      // Update booking status
      const inBooking = await Booking.findOne({
        where: { apartment_id: apartment.id },
      });
      if (inBooking) {
        await Booking.update({ id: inBooking.id }, { bron_is_active: false });
      }

      await this.payForInstallment({
        order_id: updateOrderDto.order_id,
        currency_value: order.currency_value,
        amount: Math.round(Number(order.total_amount - order.initial_pay)),
        paymentmethods: Paymentmethods.CASH,
      });
      await queryRunner.commitTransaction();
      return updatedOrder;
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      return { message: `Transaction failed: ${error}` };
    } finally {
      await queryRunner.release();
    }
  }

  async reCreateOrder(updateOrderDto: ReCreateOrderDto, users: any) {
    // Find the existing order with necessary relations

    const queryRunner =
      this.ordersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await queryRunner.manager.findOne(Orders, {
        where: {
          id: updateOrderDto.order_id,
          order_status: OrderStatus.ACTIVE,
        },
        relations: ['payments', 'clients', 'paymentMethods'],
      });

      if (!order) {
        throw new HttpException(
          'Bu shartnoma tugatilgan yoki topilmadi!',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Find the order item and apartment
      const orderItem = await OrderItems.findOne({
        where: { order_id: updateOrderDto.order_id },
        relations: ['apartments'],
      });

      const checkApartment = await Apartments.findOne({
        where: { id: orderItem.apartments.id },
        relations: ['floor.entrance.buildings'],
      });

      // Calculate prices based on payment method
      const payment_method = await PaymentMethods.findOne({
        where: { id: Number(order.payment_method_id) },
      });

      let initial_pay,
        deal_price,
        kv_price,
        kv_price_usd,
        mk_price,
        mk_price_usd;

      if (
        ['dollar', 'nasiya_dollar'].includes(
          payment_method.name_alias.toLowerCase(),
        )
      ) {
        deal_price = Math.round(
          Number(updateOrderDto.price) * Number(updateOrderDto.currency_value),
        );
        initial_pay = Math.round(
          Number(updateOrderDto.initial_pay) *
            Number(updateOrderDto.currency_value),
        );
        kv_price = Math.round(
          Number(updateOrderDto.price) * Number(updateOrderDto.currency_value),
        );
        kv_price_usd = Math.round(Number(updateOrderDto.price));
        mk_price = Math.round(Number(checkApartment.mk_price) || 0);
        mk_price_usd = Math.round(
          Number(checkApartment.mk_price || 0) /
            Number(updateOrderDto.currency_value),
        );
      } else {
        deal_price = Math.round(Number(updateOrderDto.price));
        initial_pay = Math.round(Number(updateOrderDto.initial_pay));
        kv_price_usd = Math.round(
          Number(updateOrderDto.price) / Number(updateOrderDto.currency_value),
        );
        kv_price = Math.round(Number(updateOrderDto.price));
        mk_price = Math.round(Number(updateOrderDto.price) || 0);
        mk_price_usd = Math.round(
          Number(updateOrderDto.price || 0) /
            Number(updateOrderDto.currency_value),
        );
      }
      const initial_floored = initial_pay;
      const apartment = checkApartment;
      const total = deal_price
        ? deal_price * apartment.room_space
        : updateOrderDto.price * apartment.room_space;
      const total_floored = Math.round(
        updateOrderDto.price * apartment.room_space,
      );
      const total_in_usd = Math.round(total / updateOrderDto.currency_value);

      // Update order
      const updatedOrder = await this.ordersRepository.update(
        { id: updateOrderDto.order_id },
        {
          client_id: updateOrderDto.client_id,
          payment_method_id: payment_method.id,
          order_status:
            total_floored === initial_floored
              ? OrderStatus.COMPLETED
              : OrderStatus.ACTIVE,
          percent: order.percent,
          order_date: updateOrderDto.order_date || order.order_date,
          total_amount: total_floored,
          total_amount_usd: total_in_usd,
          initial_pay: initial_floored,
          initial_month: updateOrderDto.initial_month || order.initial_month,
          currency_value: updateOrderDto.currency_value,
          user_id: users.userId,
          contract_number: order.contract_number || order.contract_number,
          quantity: 1,
          delivery_time: order.delivery_time,
        },
      );

      // Create credit schedule for specific payment methods
      let schedule;
      if (
        ['subsidia', 'ipoteka', 'nasiya_naqd', 'nasiya_dollar'].includes(
          payment_method.name_alias.toLowerCase(),
        )
      ) {
        const installment_month = updateOrderDto.initial_month;
        const oneMonthDue = initial_floored
          ? Math.round(
              payment_method.name_alias.toLowerCase() === 'nasiya_dollar'
                ? (total_floored - initial_floored) / installment_month
                : (total_floored - initial_floored > 0
                    ? total_floored - initial_floored
                    : total_floored) / installment_month,
            )
          : Math.round(total_floored / installment_month);

        console.time('Fetch existing installments');
        const existingInstallments = await queryRunner.manager.find(
          CreditTable,
          {
            where: { order_id: updateOrderDto.order_id },
            order: { due_date: 'ASC' }, // Consistent ordering
          },
        );
        console.timeEnd('Fetch existing installments');

        // Batch update existing records
        console.time('Batch update');
        const updatePromises: Promise<any>[] = [];
        for (
          let i = 0;
          i < existingInstallments.length && i < installment_month;
          i++
        ) {
          const baseDate = new Date(order.order_date);
          const dueDate = new Date(
            baseDate.setMonth(baseDate.getMonth() + i + 1),
          );

          updatePromises.push(
            CreditTable.update(
              { id: existingInstallments[i].id },
              {
                order_id: updateOrderDto.order_id,
                due_amount: oneMonthDue,
                due_date: dueDate,
                left_amount: 0,
                paid_amount: 0,
                usd_due_amount: Math.round(
                  oneMonthDue / updateOrderDto.currency_value,
                ),
                currency_value: updateOrderDto.currency_value,
                status: 'waiting',
              },
            ),
          );
        }
        await Promise.all(updatePromises); // Execute updates concurrently
        console.timeEnd('Batch update');

        // Create new records if needed
        const creditSchedule: CreditTable[] = [];
        for (let i = existingInstallments.length; i < installment_month; i++) {
          const baseDate = new Date(order.order_date);
          const dueDate = new Date(
            baseDate.setMonth(baseDate.getMonth() + i + 1),
          );

          const installment = new CreditTable();
          installment.order_id = updateOrderDto.order_id;
          installment.due_amount = oneMonthDue;
          installment.due_date = dueDate;
          installment.left_amount = 0;
          installment.paid_amount = 0;
          installment.usd_due_amount = Math.round(
            oneMonthDue / updateOrderDto.currency_value,
          );
          installment.currency_value = updateOrderDto.currency_value;
          installment.status = 'waiting';

          creditSchedule.push(installment);
        }

        // Save new records
        if (creditSchedule.length > 0) {
          console.time('Save new installments');
          await CreditTable.save(creditSchedule);
          console.timeEnd('Save new installments');
        }

        // Optionally delete excess records (only if explicitly required)
        if (existingInstallments.length > installment_month) {
          console.warn(
            `Found ${
              existingInstallments.length - installment_month
            } excess records. Deletion skipped to preserve payment schedules.`,
          );
          // Uncomment the following if you want to delete excess records
          /*
          const excessIds = existingInstallments
            .slice(installment_month)
            .map((inst) => inst.id);
          console.time('Delete excess records');
          await queryRunner.manager.delete(CreditTable, { id: In(excessIds) });
          console.timeEnd('Delete excess records');
          */
        }
      }

      // Create new order item
      const orderItemData = {
        order_id: updateOrderDto.order_id,
        apartments: apartment,
        price: kv_price,
        price_usd: kv_price_usd,
        final_price: total_floored,
        mk_price: mk_price,
        mk_price_usd: mk_price_usd,
      };

      const existingOrderItem = await OrderItems.findOne({
        where: { order_id: updateOrderDto.order_id },
      });

      if (existingOrderItem) {
        await OrderItems.update(
          { order_id: updateOrderDto.order_id },
          orderItemData,
        );
      } else {
        const newOrderItem = new OrderItems();
        Object.assign(newOrderItem, orderItemData);
        await OrderItems.save(newOrderItem);
      }

      // Update apartment status
      await Apartments.update(
        { id: apartment.id },
        { status: ApartmentStatus.SOLD },
      );

      // Update booking status
      const inBooking = await Booking.findOne({
        where: { apartment_id: apartment.id },
      });
      if (inBooking) {
        await Booking.update({ id: inBooking.id }, { bron_is_active: false });
      }

      await this.payForInstallment({
        order_id: updateOrderDto.order_id,
        currency_value: updateOrderDto.currency_value,
        amount: Math.round(
          Number(updateOrderDto.paid_amount - updateOrderDto.initial_pay),
        ),
        paymentmethods: Paymentmethods.CASH,
      });
      await queryRunner.commitTransaction();
      return updatedOrder;
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      return { message: `Transaction failed: ${error}` };
    } finally {
      await queryRunner.release();
    }
  }

  public async payForInstallment(installmentDto: {
    order_id: number;
    currency_value: number;
    amount: number;
    paymentmethods: any;
  }) {
    // Kiritilgan summa (so'mda)
    let money =
      installmentDto.paymentmethods === Paymentmethods.USD
        ? Math.round(
            Number(installmentDto.amount) *
              Number(installmentDto.currency_value),
          )
        : Math.round(Number(installmentDto.amount));

    const currencyValue = Number(installmentDto.currency_value);

    // Barcha to'lovlarni olish va tartib bilan ishlash
    const payments = await CreditTable.find({
      where: { order_id: installmentDto.order_id },
      order: { due_date: 'ASC' },
      relations: ['orders'],
    });

    // Umumiy qarzdorlikni hisoblash
    const totalDueAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.due_amount),
      0,
    );
    let totalPaidAmount = payments.reduce(
      (sum, payment) => sum + Number(payment.paid_amount || 0),
      0,
    );

    // To'lov jarayoni
    for (let i = 0; i < payments.length && money > 0; i++) {
      const payment = payments[i];

      // Agar joriy qator allaqachon to'langan bo'lsa, o'tkazib yuboramiz
      if (payment.status === 'paid') continue;

      // Joriy qatorning qarzdorlik summasi
      const amount = Number(payment.due_amount);

      console.log(
        `Qator ${
          i + 1
        }: To'lov uchun mavjud pul: ${money}, Qarzdorlik: ${amount}`,
      );

      // To'lov miqdorini hisoblash
      const amountToPay = Math.min(money, amount);
      const remainingAmount = amount - amountToPay;
      const remainingAmountUsd = Math.round(remainingAmount / currencyValue);

      // To'lov holatini yangilash
      await CreditTable.update(
        { id: payment.id },
        {
          status: remainingAmount <= 0 ? 'paid' : 'waiting',
          paid_amount: Number(payment.paid_amount || 0) + amountToPay,
          left_amount: remainingAmount,
          left_amount_usd: remainingAmountUsd,
          currency_value: currencyValue,
        },
      );

      money -= amountToPay;
      totalPaidAmount += amountToPay;

      console.log(
        `Qator ${
          i + 1
        }: To'landi: ${amountToPay}, Qoldiq: ${remainingAmount} so'm, ${remainingAmountUsd} USD`,
      );
    }

    // Umumiy qoldiqni qayta hisoblash
    const remainingTotal = Math.max(0, totalDueAmount - totalPaidAmount);
    const remainingTotalUsd = Math.round(remainingTotal / currencyValue);

    // Grafik holatini tekshirish va yakunlash
    const updatedPayments = await CreditTable.find({
      where: { order_id: installmentDto.order_id },
      order: { due_date: 'ASC' },
    });

    const allPaid = updatedPayments.every(
      (payment) => payment.status === 'paid',
    );

    if (allPaid || remainingTotal <= 0) {
      console.log("Grafik to'liq yopildi.");
      // Qoldiq summalarni 0 ga tenglashtirish
      await CreditTable.update(
        { order_id: installmentDto.order_id },
        { left_amount: 0, left_amount_usd: 0, status: 'paid' },
      );
      // Orders jadvalida holatni yangilash (agar kerak bo'lsa)
      // await Orders.update({ id: installmentDto.order_id }, { status: 'completed' });
    } else {
      console.log(
        `To'lov yetmadi. Umumiy qoldiq: ${remainingTotal} so'm, ${remainingTotalUsd} USD`,
      );

      // Qoldiq summalarni oxirgi waiting qatorida yangilash
      const lastWaitingPayment = updatedPayments.find(
        (payment) => payment.status === 'waiting',
      );
      if (lastWaitingPayment) {
        await CreditTable.update(
          { id: lastWaitingPayment.id },
          { left_amount: remainingTotal, left_amount_usd: remainingTotalUsd },
        );
      }
    }
    console.log("To'lov jarayoni yakunlandi.");
  }

  // ===================== active shartnomalar ro'yxatini olish =============================

  // async getActiveOrdersList(id: number, user_id: any) {
  //   let order;
  //   if (id == 0) {
  //     order = await this.ordersRepository.find({
  //       where: {
  //         order_status: In([OrderStatus.ACTIVE, OrderStatus.COMPLETED]),
  //       },
  //       order: { id: 'desc', order_status: 'ASC' },
  //       relations: [
  //         'clients',
  //         'users',
  //         'payments.caishers',
  //         'paymentMethods',
  //         'orderItems.apartments.floor.entrance.buildings.towns',
  //       ],
  //     });
  //
  //     order.forEach((orderItem) => {
  //       orderItem.total_amount = Math.round(Number(orderItem.total_amount));
  //       orderItem.total_amount_usd = Math.round(Number(orderItem.total_amount_usd));
  //
  //       // Calculate sum of IN and OUT payments
  //       const sumOfInPayments = orderItem.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.IN
  //             ? accumulator + Number(currentPayment.amount)
  //             : accumulator,
  //         0,
  //       );
  //       const sumOfOutPayments = orderItem.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.OUT
  //             ? accumulator + Number(currentPayment.amount)
  //             : accumulator,
  //         0,
  //       );
  //       const sumOfInPaymentsUsd = orderItem.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.IN
  //             ? accumulator + Number(currentPayment.amount_usd)
  //             : accumulator,
  //         0,
  //       );
  //       const sumOfOutPaymentsUsd = orderItem.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.OUT
  //             ? accumulator + Number(currentPayment.amount_usd)
  //             : accumulator,
  //         0,
  //       );
  //
  //       // Net amounts (IN - OUT)
  //       orderItem.net_amount = sumOfInPayments - sumOfOutPayments;
  //       orderItem.net_amount_usd = sumOfInPaymentsUsd - sumOfOutPaymentsUsd;
  //
  //       // Optional: Keep total sums if needed
  //       orderItem.sumOfpayments = sumOfInPayments - sumOfOutPayments;
  //       orderItem.sumOfpayments_usd = sumOfInPaymentsUsd - sumOfOutPaymentsUsd;
  //     });
  //   } else {
  //     order = await this.ordersRepository.findOne({
  //       where: { id: id },
  //       order: { id: 'desc', order_status: 'ASC' },
  //       relations: ['clients', 'payments.caishers', 'users', 'paymentMethods'],
  //     });
  //
  //     if (order) {
  //       // Calculate sum of IN and OUT payments
  //       const sumOfInPayments = order.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.IN
  //             ? accumulator + Number(currentPayment.amount)
  //             : accumulator,
  //         0,
  //       );
  //       const sumOfOutPayments = order.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.OUT
  //             ? accumulator + Number(currentPayment.amount)
  //             : accumulator,
  //         0,
  //       );
  //       const sumOfInPaymentsUsd = order.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.IN
  //             ? accumulator + Number(currentPayment.amount_usd)
  //             : accumulator,
  //         0,
  //       );
  //       const sumOfOutPaymentsUsd = order.payments.reduce(
  //         (accumulator, currentPayment) =>
  //           currentPayment.caishers?.type === Caishertype.OUT
  //             ? accumulator + Number(currentPayment.amount_usd)
  //             : accumulator,
  //         0,
  //       );
  //
  //       // Net amounts (IN - OUT)
  //       order.net_amount = sumOfInPayments - sumOfOutPayments;
  //       order.net_amount_usd = sumOfInPaymentsUsd - sumOfOutPaymentsUsd;
  //
  //       // Optional: Keep total sums if needed
  //       order.sumOfpayments = sumOfInPayments - sumOfOutPayments;
  //       order.sumOfpayments_usd = sumOfInPaymentsUsd - sumOfOutPaymentsUsd;
  //     }
  //   }
  //   return order;
  // }

  async getActiveOrdersList(id: number, user_id: any) {
    let order;

    order = await this.ordersRepository.find({
      where: {
        order_status: In([OrderStatus.ACTIVE, OrderStatus.COMPLETED]),
      },
      order: { id: 'DESC', order_status: 'ASC' },
      relations: [
        'clients',
        'users',
        'payments.caishers',
        'paymentMethods',
        'orderItems.apartments.floor.entrance.buildings.towns',
      ],
    });

    order = order?.map((orderItem) => {
      // Calculate total_amount as sum of (orderItems.price * apartments.room_space)
      const total_amount = orderItem.orderItems.reduce((accumulator, item) => {
        const price = Number(item.price) || 0;
        const room_space = Number(item.apartments?.room_space) || 0;
        return accumulator + price * room_space;
      }, 0);

      // Calculate total_amount_usd (assuming a similar field or conversion)
      // If you have a price_usd field in OrderItems, use it; otherwise, adjust as needed
      const total_amount_usd = orderItem.orderItems.reduce(
        (accumulator, item) => {
          const price_usd = Number(item.price_usd) || 0; // Replace with actual field or conversion logic
          const room_space = Number(item.apartments?.room_space) || 0;
          return accumulator + price_usd * room_space;
        },
        0,
      );

      // Calculate payment sums
      const sumOfPayments = orderItem.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.IN
            ? accumulator + Number(currentPayment.amount)
            : accumulator,
        0,
      );

      const sumOfPayments_usd = orderItem.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.IN
            ? accumulator + Number(currentPayment.amount_usd)
            : accumulator,
        0,
      );

      const sumOfOutPayments = orderItem.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.OUT
            ? accumulator + Number(currentPayment.amount)
            : accumulator,
        0,
      );

      const sumOfOutPayments_usd = orderItem.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.OUT
            ? accumulator + Number(currentPayment.amount_usd)
            : accumulator,
        0,
      );

      const net_payments = sumOfPayments - sumOfOutPayments;
      const net_payments_usd = sumOfPayments_usd - sumOfOutPayments_usd;

      // Calculate outstanding balance using the new total_amount
      const outstanding_balance = total_amount - net_payments;
      const outstanding_balance_usd = total_amount_usd - net_payments_usd;

      return {
        ...orderItem,
        total_amount: total_amount,
        total_amount_usd: total_amount_usd,
        sumOfPayments: sumOfPayments || 0,
        sumOfPayments_usd: sumOfPayments_usd || 0,
        sumOfOutPayments: sumOfOutPayments || 0,
        sumOfOutPayments_usd: sumOfOutPayments_usd || 0,
        net_payments: net_payments,
        net_payments_usd: net_payments_usd,
        outstanding_balance: outstanding_balance,
        outstanding_balance_usd: outstanding_balance_usd,
      };
    });

    return order;
  }
  // async getActiveOrdersList(id: number, user_id: any) {
  //   let order;
  //
  //   order = await this.ordersRepository.find({
  //     where: {
  //       order_status: In([OrderStatus.ACTIVE, OrderStatus.COMPLETED]),
  //     },
  //     order: { id: 'DESC', order_status: 'ASC' },
  //     relations: [
  //       'clients',
  //       'users',
  //       'payments.caishers',
  //       'paymentMethods',
  //       'orderItems.apartments.floor.entrance.buildings.towns',
  //     ],
  //   });
  //
  //   order?.map((orderItem) => {
  //     // orderItem.total_amount = Math.round(Number(orderItem.total_amount));
  //     // orderItem.total_amount_usd = Math.round(
  //     //   Number(orderItem.total_amount_usd),
  //     // );
  //     const sumOfPayments = orderItem.payments.reduce(
  //       (accumulator, currentPayment) =>
  //         currentPayment?.caisher_type === Caishertype.IN
  //           ? accumulator + Number(currentPayment.amount)
  //           : accumulator,
  //       0,
  //     );
  //
  //     const sumOfPayments_usd = orderItem.payments.reduce(
  //       (accumulator, currentPayment) =>
  //         currentPayment?.caisher_type === Caishertype.IN
  //           ? accumulator + +currentPayment.amount_usd
  //           : accumulator,
  //       0,
  //     );
  //
  //     const sumOfOutPayments = orderItem.payments.reduce(
  //       (accumulator, currentPayment) =>
  //         currentPayment?.caisher_type === Caishertype.OUT
  //           ? accumulator + Number(currentPayment.amount)
  //           : accumulator,
  //       0,
  //     );
  //     const sumOfOutPayments_usd = orderItem.payments.reduce(
  //       (accumulator, currentPayment) =>
  //         currentPayment?.caisher_type === Caishertype.OUT
  //           ? accumulator + +currentPayment.amount_usd
  //           : accumulator,
  //       0,
  //     );
  //     const net_payments = sumOfPayments - sumOfOutPayments;
  //     const net_payments_usd = sumOfPayments_usd - sumOfOutPayments_usd;
  //
  //     // Calculate outstanding balance
  //     const outstanding_balance =
  //       Number(orderItem.total_amount || 0) - net_payments;
  //     const outstanding_balance_usd =
  //       Number(orderItem.total_amount_usd || 0) - net_payments_usd;
  //
  //     orderItem.total_amount=orderItem.price*
  //     orderItem.sumOfpayments = sumOfPayments ? sumOfPayments : 0;
  //     orderItem.sumOfpayments_usd = sumOfPayments_usd ? sumOfPayments_usd : 0;
  //     orderItem.sumOfOutPayments = sumOfOutPayments ? sumOfOutPayments : 0;
  //     orderItem.sumOfOutPayments_usd = sumOfOutPayments_usd
  //       ? sumOfOutPayments_usd
  //       : 0;
  //     orderItem.net_payments = sumOfPayments - sumOfOutPayments;
  //     orderItem.net_payments_usd = sumOfPayments_usd - sumOfOutPayments_usd;
  //     // orderItem.payments= paymentsWithSummary;
  //
  //     return {
  //       ...orderItem,
  //     };
  //   });
  //
  //   return order;
  // }

  //=========================== apartment_id berilsa shu aydi boglangan orderni olib kelib beradi ==================================

  async findOrderByApartmentID(id: number) {
    const order = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.apartments', 'apartment')
      // .leftJoinAndSelect('apartment.floor', 'floor')
      // .leftJoinAndSelect('floor.entrance', 'entrance')
      // .leftJoinAndSelect('entrance.towns', 'towns')
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
      .getOne();

    if (order) {
      // const sumOfPayments = order.payments.reduce(
      //   (accumulator, currentPayment) => accumulator + +currentPayment.amount,
      //   0,
      // );
      // const sumOfPayments_usd = order.payments.reduce(
      //   (accumulator, currentPayment) =>
      //     accumulator + +currentPayment.amount_usd,
      //   0,
      // );

      const sumOfPayments = order.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.IN
            ? accumulator + Number(currentPayment.amount)
            : accumulator,
        0,
      );

      const sumOfPayments_usd = order.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.IN
            ? accumulator + +currentPayment.amount_usd
            : accumulator,
        0,
      );

      const sumOfOutPayments = order.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.OUT
            ? accumulator + Number(currentPayment.amount)
            : accumulator,
        0,
      );
      const sumOfOutPayments_usd = order.payments.reduce(
        (accumulator, currentPayment) =>
          currentPayment?.caisher_type === Caishertype.OUT
            ? accumulator + +currentPayment.amount_usd
            : accumulator,
        0,
      );
      const net_payments = sumOfPayments - sumOfOutPayments;
      const net_payments_usd = sumOfPayments_usd - sumOfOutPayments_usd;

      const outstanding_balance =
        Number(order.total_amount || 0) - net_payments;
      const outstanding_balance_usd =
        Number(order.total_amount_usd || 0) - net_payments_usd;

      order['sumOfpayments'] = sumOfPayments ? Math.floor(sumOfPayments) : 0;
      order['sumOfpayments_usd'] = sumOfPayments_usd
        ? Math.floor(sumOfPayments_usd)
        : 0;
      // order['sumOfpayments'] = sumOfPayments ? sumOfPayments : 0;
      // order['sumOfpayments_usd'] = sumOfPayments_usd ? sumOfPayments_usd : 0;
      order['sumOfOutPayments'] = sumOfOutPayments ? sumOfOutPayments : 0;
      order['sumOfOutPayments_usd'] = sumOfOutPayments_usd
        ? sumOfOutPayments_usd
        : 0;
      order['net_payments'] = sumOfPayments - sumOfOutPayments;
      order['net_payments_usd'] = sumOfPayments_usd - sumOfOutPayments_usd;
    }
    return order;
  }

  async getOrderListIsDue(refundDto: RefundDto) {
    const activeness = refundDto.is_refunding
      ? OrderStatus.INACTIVE
      : OrderStatus.ACTIVE;

    const orders = await this.ordersRepository
      .createQueryBuilder('orders')
      .addSelect('orders.id')
      .addSelect('orders.order_date')
      .addSelect('orders.contract_number')
      .addSelect('orders.total_amount')
      .addSelect('orders.total_amount_usd')
      .addSelect('orders.order_status')
      .leftJoinAndSelect(
        'orders.clients',
        'clients',
        'clients.id = orders.client_id',
      )
      .leftJoinAndSelect(
        'orders.payments',
        'payments',
        'payments.order_id = orders.id',
      )
      .where('orders.order_status = :logic', { logic: activeness })
      .getMany();

    const result = orders.map((data) => {
      const { incomingSum, outgoingSum, incomingSum_usd, outgoingSum_usd } =
        data.payments.reduce(
          (accumulator, payment) => {
            if (payment?.caisher_type === Caishertype.IN) {
              accumulator.incomingSum += Number(payment.amount);
              accumulator.incomingSum_usd += Number(payment.amount_usd);
            } else if (payment?.caisher_type === Caishertype.OUT) {
              accumulator.outgoingSum += Number(payment.amount);
              accumulator.outgoingSum_usd += Number(payment.amount_usd);
            }
            return accumulator;
          },
          {
            incomingSum: 0,
            outgoingSum: 0,
            incomingSum_usd: 0,
            outgoingSum_usd: 0,
          },
        );

      const net_payments = incomingSum - outgoingSum;
      const net_payments_usd = incomingSum_usd - outgoingSum_usd;
      const outstanding_balance = Number(data.total_amount) - net_payments;
      const outstanding_balance_usd =
        Number(data.total_amount_usd) - net_payments_usd;

      return {
        order_id: data.id,
        contract_number: data.contract_number,
        order_date: data.order_date,
        clients: `${data.clients.first_name} ${data.clients.last_name}`,
        incoming_amount: incomingSum,
        outgoing_amount: outgoingSum,
        net_payments,
        net_payments_usd,
        outstanding_balance,
        outstanding_balance_usd,
        order_status: data.order_status,
      };
    });
    // .filter((order) => order.incoming_amount > 0 && order.outgoing_amount > 0);

    return result;
  }

  // async getOrderListIsDue(refundDto: RefundDto) {
  //   let activeness;
  //   if (refundDto.is_refunding) {
  //     activeness = OrderStatus.INACTIVE;
  //   } else {
  //     activeness = OrderStatus.ACTIVE;
  //   }
  //   const result = [];
  //   const orders = await this.ordersRepository
  //     .createQueryBuilder('orders')
  //     .addSelect('orders.id')
  //     .addSelect('orders.order_date')
  //     .leftJoinAndSelect(
  //       'orders.clients',
  //       'clients',
  //       'clients.id=orders.client_id',
  //     )
  //     .leftJoinAndSelect(
  //       'orders.payments',
  //       'payments',
  //       'payments.order_id=orders.id',
  //     )
  //     .where('orders.order_status =:logic', { logic: activeness })
  //     .getMany();
  //
  //   orders.forEach((data) => {
  //     if (refundDto.is_refunding) {
  //       const { incomingSum, outgoingSum } = data.payments.reduce(
  //         (accumulator, currentValue) => {
  //           currentValue.caisher_type === 'in'
  //             ? (accumulator.incomingSum += +currentValue.amount)
  //             : (accumulator.outgoingSum += +currentValue.amount);
  //           return accumulator;
  //         },
  //         { incomingSum: 0, outgoingSum: 0 },
  //       );
  //
  //       result.push({
  //         order_id: data.id,
  //         contract_number: data.contract_number,
  //         order_date: data.order_date,
  //         clients: data.clients.first_name + ' ' + data.clients.last_name,
  //         left_amount: incomingSum - outgoingSum,
  //         order_status: data.order_status,
  //       });
  //     } else {
  //       const sum = data.payments.reduce((accumulator, currentValue) => {
  //         return accumulator + Math.round(currentValue.amount);
  //       }, 0);
  //
  //       const sum_usd = data.payments.reduce((accumulator, currentValue) => {
  //         return accumulator + Math.round(currentValue.amount_usd);
  //       }, 0);
  //
  //       result.push({
  //         contract_number: data.contract_number,
  //         order_id: data.id,
  //         order_date: data.order_date,
  //         clients: data.clients.first_name + ' ' + data.clients.last_name,
  //         totalsum: Math.floor(data.total_amount - sum),
  //         totalsum_usd: Math.floor(data.total_amount_usd - sum_usd),
  //         order_status: data.order_status,
  //       });
  //     }
  //   });
  //   return result;
  // }

  // =================== shartnomani tahrirlash ==================================

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto, users: any) {
    //shartnoma tuziliyotgan vaqtdagi dollar kursi
    const order_id = await Orders.findOne({
      where: { id: id, order_status: OrderStatus.ACTIVE },
    });

    const order_item: OrderItems = await OrderItems.findOne({
      where: { order_id: id },
    });

    await CreditTable.delete({ order_id: id });
    await OrderItems.delete({ order_id: id });

    if (order_id) {
      const usdRate = await ExchangRates.findOne({
        where: { is_default: true },
      });
      const payment_method = await PaymentMethods.findOne({
        where: { id: +updateOrderDto.payment_method_id },
      });
      const checkApartment = await Apartments.findOne({
        where: { id: +updateOrderDto.apartment_id },
      });

      await Apartments.update(
        { id: order_item.apartment_id, status: ApartmentStatus.SOLD },
        { status: ApartmentStatus.FREE },
      ).then((data) => {
        console.log(data.raw);
      });

      let initial_pay,
        deal_price,
        kv_price_usd,
        kv_price,
        mk_price,
        mk_price_usd;

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
      const initial_floored = initial_pay;
      const order = new Orders();
      order.client_id = updateOrderDto.client_id;
      order.paymentMethods = payment_method;
      order.order_status = updateOrderDto.order_status;
      order.percent = updateOrderDto.percent;
      order.order_date = updateOrderDto.order_date;
      order.initial_pay = initial_floored;
      order.initial_month = updateOrderDto.initial_month;
      order.currency_value = usdRate.rate_value;
      order.user_id = users.userId;
      order.contract_number = updateOrderDto.contractNum;
      // await Users.findOne({ where: { id: users.userId } });
      order.quantity = 1;
      order.delivery_time = updateOrderDto.delivery_time;
      const savedOrder = await this.ordersRepository
        .update({ id: order_id.id }, order)
        .then((data) => {
          return data.raw.orders;
        });

      const apartment = await Apartments.findOne({
        where: { id: updateOrderDto.apartment_id },
        relations: ['floor.entrance.buildings'],
      });

      const total = deal_price
        ? deal_price * apartment.room_space
        : apartment.floor.entrance.buildings.mk_price * apartment.room_space;

      const total_floored = total;
      let schedule;

      if (
        payment_method.name_alias.toLowerCase() === 'subsidia' ||
        payment_method.name_alias.toLowerCase() === 'ipoteka'
      ) {
        const oneMonthDue = updateOrderDto.initial_pay
          ? Math.round(
              Number(total - updateOrderDto.initial_pay) /
                Number(updateOrderDto.initial_month),
            )
          : Math.round(Number(total / updateOrderDto.initial_month));

        const creditSchedule = [];
        const date = new Date();

        for (let i = 1; i <= updateOrderDto.initial_month; i++) {
          const mon = new Date(date.setMonth(date.getMonth() + 1));

          const installment = new CreditTable();
          installment.order_id = id;
          installment.due_amount = oneMonthDue;
          installment.due_date = mon;
          installment.left_amount = 0;
          installment.usd_due_amount = Math.round(
            Number(installment.due_amount / usdRate.rate_value),
          );
          installment.currency_value = usdRate.rate_value;
          installment.status = 'waiting';
          creditSchedule.push(installment);
        }

        schedule = await CreditTable.save(creditSchedule);
      }

      const total_in_usd = total / usdRate.rate_value;

      const updatedOrder = await this.ordersRepository.update(
        { id: id },
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
      orderItem.order_id = id;
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

      const orderItemAvailable = await OrderItems.findOne({
        where: { order_id: id },
      });
      if (orderItemAvailable) {
        await OrderItems.update({ order_id: id }, orderItem);
      } else {
        await OrderItems.save(orderItem);
      }

      const paymentItem = await Payments.findOne({ where: { order_id: id } });
      const payment = new Payments();
      payment.order_id = id;
      payment.users = users.userId;
      payment.amount = updateOrderDto.initial_pay;
      payment.payment_date = updateOrderDto.order_date;
      payment.paymentmethods = Paymentmethods.CASH;
      payment.caishers = await Caisher.findOne({
        where: { id: updateOrderDto.caisher_id, is_active: true },
      });
      payment.amount_usd = Math.round(
        Number(updateOrderDto.initial_pay / usdRate.rate_value),
      );
      payment.currency_value = usdRate.rate_value;
      payment.caisher_type = Caishertype.IN;
      payment.payment_status = PaymentStatus.PAID;
      payment.pay_note = "Boshlangich to'lov";

      // const updatePayment: NewPaymentDto = {
      //   user_id: users.userId,
      //   order_id: id,
      //   paymentmethods: payment.paymentmethods,
      //   payment_date: updateOrderDto.order_date,
      //   amount: 0,
      //   currency_value: usdRate.rate_value,
      //   caisher_id: await Caisher.findOne({
      //     where: { id: updateOrderDto.caisher_id, is_active: true },
      //   }).then((data) => data.id),
      //   caishertype: Caishertype.IN,
      //   payment_status: PaymentStatus.PAID,
      //   pay_note: '',
      //   is_completed: false,
      // };
      //
      // if (
      //   payment_method.name_alias.toLowerCase() === 'subsidia' ||
      //   payment_method.name_alias.toLowerCase() === 'ipoteka'
      // ) {
      //   this.paymentService.updatepayForInstallment2(updatePayment);
      // } else {
      //   this.paymentService.doUpdatePayment(id, updatePayment);
      // }

      if (paymentItem) {
        await Payments.update(
          { order_id: id, payment_date: paymentItem.payment_date },
          payment,
        );
      } else {
        await Payments.save(payment);
      }

      return updatedOrder;
    } else {
      throw new HttpException(
        'Bu shartnomani tugatilgan !!! ',
        HttpStatus.BAD_REQUEST,
      );
    }
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

  async createTransfer(createOrderDto: TransferOrderDto, users: any) {
    const order = await Orders.findOne({
      where: {
        client_id: createOrderDto.client_id,
        order_status: OrderStatus.ACTIVE,
      },
    });

    await this.ordersRepository
      .createQueryBuilder()
      .update(Orders)
      .set({
        user_id: users.userId,

        client_id: createOrderDto.to_client_id,
        to_client_id: createOrderDto.client_id,
      })
      .where({ id: order.id })
      .execute();
    // if (order) {
    //   order.user_id = users.userId;
    //   order.id = createOrderDto.order_id;
    //   order.client_id = createOrderDto.client_id;
    //   order.to_client_id = createOrderDto.to_client_id;
    //   await order.save();
    // } else {
    //   throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    // }

    return order;
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

  async getOrderPaymetList() {
    const result = await this.ordersRepository.find({
      where: { order_status: OrderStatus.ACTIVE },
      relations: [
        'orderItems',
        'orderItems.apartments.floor.entrance.buildings.towns',
        'paymentMethods',
        'payments',
        'clients',
      ],
    });

    const processedOrders = result.map((order) => {
      // Calculate incoming payments
      const sumOfPayments = order.payments.reduce(
        (accumulator, payment) =>
          payment?.caisher_type === Caishertype.IN
            ? accumulator + Number(payment.amount)
            : accumulator,
        0,
      );

      const sumOfPayments_usd = order.payments.reduce(
        (accumulator, payment) =>
          payment?.caisher_type === Caishertype.IN
            ? accumulator + Number(payment.amount_usd)
            : accumulator,
        0,
      );

      // Calculate outgoing payments
      const sumOfOutPayments = order.payments.reduce(
        (accumulator, payment) =>
          payment?.caisher_type === Caishertype.OUT
            ? accumulator + Number(payment.amount)
            : accumulator,
        0,
      );

      const sumOfOutPayments_usd = order.payments.reduce(
        (accumulator, payment) =>
          payment?.caisher_type === Caishertype.OUT
            ? accumulator + Number(payment.amount_usd)
            : accumulator,
        0,
      );

      // Calculate net payments
      const net_payments = Math.round(sumOfPayments - sumOfOutPayments);
      const net_payments_usd = Math.round(
        sumOfPayments_usd - sumOfOutPayments_usd,
      );

      // Calculate outstanding balance
      const outstanding_balance = Math.round(
        Number(order.total_amount) - net_payments,
      );
      const outstanding_balance_usd = Math.round(
        Number(order.total_amount_usd) - net_payments_usd,
      );

      // Return order with additional fields
      return {
        ...order,
        sumOfPayments: sumOfPayments || 0,
        sumOfPayments_usd: sumOfPayments_usd || 0,
        sumOfOutPayments: sumOfOutPayments || 0,
        sumOfOutPayments_usd: sumOfOutPayments_usd || 0,
        net_payments,
        net_payments_usd,
        outstanding_balance,
        outstanding_balance_usd,
      };
    });
    // Filter for orders with both incoming and outgoing payments
    // .filter((order) => order.sumOfPayments > 0 && order.sumOfOutPayments > 0);

    return processedOrders;
  }

  async getClientOrderCheck(id: number) {
    const order = await Orders.findOne({
      where: {
        client_id: id,
        order_status: OrderStatus.ACTIVE,
      },
      relations: ['orderItems', 'clients'],
    });
    return order;
  }
}
