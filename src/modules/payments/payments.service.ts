import { Injectable } from '@nestjs/common';
import { NewPaymentDto } from './dto/create-payment.dto';
import { In, Repository } from 'typeorm';
import { Payments } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Caisher } from '../caisher/entities/caisher.entity';
import { Users } from '../users/entities/user.entity';
import { PaymentStatus } from '../../common/enums/payment-status';
import { OrderStatus } from 'src/common/enums/order-status';
import { ExchangRates } from '../exchang-rates/entities/exchang-rate.entity';
import { Caishertype } from 'src/common/enums/caishertype';
import { Paymentmethods } from 'src/common/enums/paymentmethod';
import { OrderItems } from '../order-items/entities/order-item.entity';
import { find } from 'rxjs';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payments)
    private readonly paymentRepo: Repository<Payments>,
  ) {}

  // ========================== To'lov qabul qilish ==========================================

  async newPayment(newPaymentDto: NewPaymentDto) {
    const queryRunner = this.paymentRepo.manager.connection.createQueryRunner();
    queryRunner.startTransaction();
    try {
      const { paymentMethods } = await Orders.findOne({
        where: { id: newPaymentDto.order_id },
        relations: ['paymentMethods'],
      });

      const credit_tb_id = await CreditTable.findOne({
        where: { order_id: newPaymentDto.order_id, status: 'waiting' },
        order: { due_date: 'ASC' },
      });

      // orders.forEach((data) => {
      //   const sum = data.payments.reduce((accumulator, currentValue) => {
      //     return accumulator + Math.round(currentValue.amount);
      //   }, 0);
      //
      //   const sum_usd = data.payments.reduce((accumulator, currentValue) => {
      //     return accumulator + Math.round(currentValue.amount_usd);
      //   }, 0);
      //   // const filteredOrders = orders.filter((order) => order.id === newPaymentDto.order_id);
      //   result.push({
      //     contract_number: data.contract_number,
      //     order_date: data.order_date,
      //     // clients: data.clients.first_name + ' ' + data.clients.last_name,
      //     totalsum: Math.floor(data.total_amount - sum),
      //     totalsum_usd: Math.floor(data.total_amount_usd - sum_usd),
      //     order_status: data.order_status,
      //   });
      // });

      // const total_sum = result.map((item) => {
      //   return Math.round(Number(item.totalsum));
      // });

      newPaymentDto.credit_table_id = credit_tb_id?.id || 0;

      // const usdRate = await ExchangRates.findOne({
      //   where: { is_default: true },
      // });
      let newPay;

      if (
        (paymentMethods.name_alias.toLowerCase() == 'ipoteka' ||
          paymentMethods.name_alias.toLowerCase() == 'subsidia' ||
          paymentMethods.name_alias.toLowerCase() == 'nasiya_naqd' ||
          paymentMethods.name_alias.toLowerCase() == 'nasiya_dollar') &&
        newPaymentDto.caishertype === Caishertype.IN
      ) {
        newPay = await this.payForInstallment(newPaymentDto);
      } else {
        newPay = await this.doPayment(newPaymentDto);
      }

      const credit_summa = await CreditTable.find({
        where: { order_id: newPaymentDto.order_id, status: 'paid' },
        order: { due_date: 'ASC' },
      });

      const { creditSum } = credit_summa.reduce(
        (acc, curr) => {
          acc.creditSum += +Number(curr.due_amount);
          return acc;
        },
        {
          creditSum: 0,
        },
      );
      const result = [];
      const orders = await Orders.createQueryBuilder('orders')
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
        .andWhere('orders.id =:order_id', { order_id: newPaymentDto.order_id })
        .getOne();
      console.log(
        Number(orders?.total_amount) +
          ' - ' +
          Number(creditSum) +
          '+' +
          Number(orders?.initial_pay),
      );
      if (
        Number(orders?.total_amount) -
          (Number(creditSum) + Number(orders?.initial_pay)) ===
          0 &&
        newPaymentDto.is_completed &&
        newPaymentDto.caishertype === Caishertype.IN
      ) {
        if (paymentMethods.name_alias.toLowerCase() == 'nasiya_dollar') {
          const payments = await Payments.find({
            where: { order_id: newPaymentDto.order_id },
          });

          const orders = await Orders.findOne({
            where: { id: newPaymentDto.order_id },
          });
          const total_amount_usd = orders.total_amount_usd;

          const { incomingSum, incomingSum_usd, outgoingSum_usd, outgoingSum } =
            payments.reduce(
              (acc, curr) => {
                if (curr.caisher_type === Caishertype.IN) {
                  acc.incomingSum += +curr.amount;
                  acc.incomingSum_usd += +curr.amount_usd;
                } else {
                  acc.outgoingSum += +curr.amount;
                  acc.outgoingSum_usd += +curr.amount_usd;
                }
                return acc;
              },
              {
                incomingSum: 0,
                incomingSum_usd: 0,
                outgoingSum_usd: 0,
                outgoingSum: 0,
              },
            );

          const aprt_id = await OrderItems.findOne({
            where: { order_id: newPaymentDto.order_id },
            relations: ['apartments'],
          });

          const kv_price = Number(
            incomingSum / aprt_id?.apartments?.room_space,
          );
          const kv_price_usd = Number(
            incomingSum_usd / aprt_id?.apartments?.room_space,
          );
          const total_amount = kv_price * aprt_id?.apartments?.room_space;
          // const total_amount_usd =
          //   kv_price_usd * aprt_id?.apartments?.room_space;

          await Orders.update(
            { id: newPaymentDto.order_id },
            {
              total_amount: total_amount,
              total_amount_usd: incomingSum_usd,
              order_status: OrderStatus.COMPLETED,
            },
          );
          await OrderItems.update(
            { order_id: newPaymentDto.order_id },
            {
              price: kv_price,
              price_usd: kv_price_usd,
              order_status: OrderStatus.COMPLETED,
            },
          );
        } else {
          await Orders.update(
            { id: newPaymentDto.order_id },
            { order_status: OrderStatus.COMPLETED },
          );
          await OrderItems.update(
            { order_id: newPaymentDto.order_id },
            { order_status: OrderStatus.COMPLETED },
          );
        }
      } else if (
        newPaymentDto.is_completed &&
        newPaymentDto.caishertype === Caishertype.OUT
      ) {
        await Orders.update(
          { id: newPaymentDto.order_id },
          { order_status: OrderStatus.REFUNDED },
        );
        await OrderItems.update(
          { order_id: newPaymentDto.order_id },
          { order_status: OrderStatus.REFUNDED },
        );
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Transaction committed / payment completed',
      };
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      return { message: `Transaction failed: ${error}` };
    } finally {
      await queryRunner.release();
    }
  }

  // ========================== Barcha to'lovlar royxatini olish ==============================

  async getAllPayments(offset: number, limit: number, users: any) {
    const user = await Users.findOne({
      where: { id: users.userId },
      relations: ['roles'],
    });
    const temp_array = user.town_access?.split(',');
    const town_access: number[] = temp_array?.map((str) => Number(str));
    let orders_res;

    if (user.roles.role_name == 'SuperAdmin') {
      orders_res = await this.paymentRepo
        .createQueryBuilder('payments')
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
        // .skip(offset)
        // .take(limit)
        .orderBy('payments.id', 'DESC')
        .getMany();
    } else if (user.roles.role_name == 'manager') {
      orders_res = await this.paymentRepo
        .createQueryBuilder('payments')
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
        .where('towns.id In(:...town_access)', { town_access })
        // .skip(offset)
        // .take(limit)
        .orderBy('payments.payment_date', 'DESC')
        .getMany();
    } else if (user.roles.role_name == 'Seller') {
      orders_res = await this.paymentRepo
        .createQueryBuilder('payments')
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
        .where('towns.id In(:...town_access)', { town_access })
        .skip(offset)
        .take(limit)
        .orderBy('payments.payment_date', 'DESC')
        .getMany();
    }

    return orders_res;
  }

  // ========================== To'lovni tahrirlash ===========================================

  async update(id: number, newPaymentDto: NewPaymentDto) {
    // return await this.paymentRepo.update({ id: id }, newPaymentDto);
    const queryRunner = this.paymentRepo.manager.connection.createQueryRunner();
    queryRunner.startTransaction();
    try {


      const { paymentMethods } = await Orders.findOne({
        where: { id: newPaymentDto.order_id },
        relations: ['paymentMethods'],
      });
      //await Payments.delete({ id: id });
      // const usdRate = await ExchangRates.findOne({
      //   where: { is_default: true },
      // });

      await CreditTable.update(
        { order_id: newPaymentDto.order_id },
        {
          status: 'waiting',
          left_amount: 0,
          left_amount_usd: 0,
          paid_amount: 0,
        },
      );

      // const credit_tb_id = await CreditTable.findOne({
      //   where: { order_id: newPaymentDto.order_id, status: 'waiting' },
      //   order: { due_date: 'ASC' },
      // });
      // credit_tb_id

      // newPaymentDto.credit_table_id = credit_tb_id?.id || 0;

      let newPay;

      // if (
      //   (paymentMethods.name_alias.toLowerCase() == 'ipoteka' ||
      //     paymentMethods.name_alias.toLowerCase() == 'subsidia') &&
      //   newPaymentDto.caishertype === Caishertype.IN
      // ) {
      //   newPay = await this.payForInstallment(newPaymentDto);
      // } else {
      // newPay = await this.doUpdatePayment(id,newPaymentDto);
      // }

      if (
        (paymentMethods.name_alias.toLowerCase() == 'ipoteka' ||
          paymentMethods.name_alias.toLowerCase() == 'subsidia' ||
          paymentMethods.name_alias.toLowerCase() == 'nasiya_naqd' ||
          paymentMethods.name_alias.toLowerCase() == 'nasiya_dollar') &&
        newPaymentDto.caishertype === Caishertype.IN
      ) {
        newPay = await this.updatepayForInstallment(id,newPaymentDto);
      } else {
        newPay = await this.doUpdatePayment(id, newPaymentDto);
      }
      const credit_summa = await CreditTable.find({
        where: { order_id: newPaymentDto.order_id, status: 'paid' },
        order: { due_date: 'ASC' },
      });

      const { creditSum } = credit_summa.reduce(
        (acc, curr) => {
          acc.creditSum += +Number(curr.due_amount);
          return acc;
        },
        {
          creditSum: 0,
        },
      );
      const result = [];
      const orders = await Orders.createQueryBuilder('orders')
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
        .andWhere('orders.id =:order_id', { order_id: newPaymentDto.order_id })
        .getOne();
      console.log(
        Number(orders?.total_amount) +
          ' - ' +
          Number(creditSum) +
          '+' +
          Number(orders?.initial_pay),
      );
      if (
        Number(orders?.total_amount) -
          (Number(creditSum) + Number(orders?.initial_pay)) ===
          0 &&
        newPaymentDto.is_completed &&
        newPaymentDto.caishertype === Caishertype.IN
      ) {
        if (paymentMethods.name_alias.toLowerCase() == 'nasiya_dollar') {
          const payments = await Payments.find({
            where: { order_id: newPaymentDto.order_id },
          });

          const orders = await Orders.findOne({
            where: { id: newPaymentDto.order_id },
          });
          const total_amount_usd = orders.total_amount_usd;

          const { incomingSum, incomingSum_usd, outgoingSum_usd, outgoingSum } =
            payments.reduce(
              (acc, curr) => {
                if (curr.caisher_type === Caishertype.IN) {
                  acc.incomingSum += +curr.amount;
                  acc.incomingSum_usd += +curr.amount_usd;
                } else {
                  acc.outgoingSum += +curr.amount;
                  acc.outgoingSum_usd += +curr.amount_usd;
                }
                return acc;
              },
              {
                incomingSum: 0,
                incomingSum_usd: 0,
                outgoingSum_usd: 0,
                outgoingSum: 0,
              },
            );

          const aprt_id = await OrderItems.findOne({
            where: { order_id: newPaymentDto.order_id },
            relations: ['apartments'],
          });

          const kv_price = Number(
            incomingSum / aprt_id?.apartments?.room_space,
          );
          const kv_price_usd = Number(
            incomingSum_usd / aprt_id?.apartments?.room_space,
          );
          const total_amount = kv_price * aprt_id?.apartments?.room_space;
          // const total_amount_usd =
          //   kv_price_usd * aprt_id?.apartments?.room_space;

          await Orders.update(
            { id: newPaymentDto.order_id },
            {
              total_amount: total_amount,
              total_amount_usd: incomingSum_usd,
              order_status: OrderStatus.COMPLETED,
            },
          );
          await OrderItems.update(
            { order_id: newPaymentDto.order_id },
            {
              price: kv_price,
              price_usd: kv_price_usd,
              order_status: OrderStatus.COMPLETED,
            },
          );
        } else {
          await Orders.update(
            { id: newPaymentDto.order_id },
            { order_status: OrderStatus.COMPLETED },
          );
          await OrderItems.update(
            { order_id: newPaymentDto.order_id },
            { order_status: OrderStatus.COMPLETED },
          );
        }
      } else if (
        newPaymentDto.is_completed &&
        newPaymentDto.caishertype === Caishertype.OUT
      ) {
        await Orders.update(
          { id: newPaymentDto.order_id },
          { order_status: OrderStatus.REFUNDED },
        );
        await OrderItems.update(
          { order_id: newPaymentDto.order_id },
          { order_status: OrderStatus.REFUNDED },
        );
      }
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Transaction committed / payment completed',
      };
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      return { message: `Transaction failed: ${error}` };
    } finally {
      await queryRunner.release();
    }
  }

  // ========================== To'lovni ochirish =============================================

  async deletePayment(arrayOfId: number[]) {
    let counter = 0;
    for (const i of arrayOfId) {
      counter += (
        await this.paymentRepo.update({ id: i }, { is_deleted: true })
      ).affected;
    }

    return counter;
  }

  // ========================== o'chirilgan To'lovni qayta tiklash ============================

  async recoverPayment(arrayOfId: number[]) {
    let counter = 0;
    for (const i of arrayOfId) {
      counter += (
        await this.paymentRepo.update({ id: i }, { is_deleted: false })
      ).affected;
    }
    return counter;
  }

  // ========================== Bo'lib to'lash uchun to'lov qabul qilish ======================

  // quyidagi method  "async newPayment" metodi ichida ishlaydi yani o'sha yerda chaqirilgan
  // maqsad kod o'qilishini osonlashtirish, va tartibli bo'lishi uchun

  public async payForInstallment(installmentDto: NewPaymentDto) {
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
    return await this.doPayment(installmentDto);
  }

  // public async payForInstallment(installmentDto: NewPaymentDto) {
  //   let money =
  //     installmentDto.paymentmethods === Paymentmethods.USD
  //       ? Math.round(Number(installmentDto.amount))
  //       : Math.round(Number(installmentDto.amount));
  //
  //   while (money > 0) {
  //     const nextPaid = await CreditTable.findOne({
  //       where: { order_id: installmentDto.order_id, status: 'waiting' },
  //       order: { due_date: 'ASC' },
  //       relations: ['orders'],
  //     });
  //
  //     if (!nextPaid) {
  //       break;
  //     }
  //
  //     const amount =
  //       nextPaid.orders.payment_method_id === 6
  //         ? installmentDto.paymentmethods === Paymentmethods.USD
  //           ? nextPaid.usd_due_amount
  //           : Number(nextPaid.due_amount)
  //         : installmentDto.paymentmethods === Paymentmethods.USD
  //         ? Number(nextPaid.usd_due_amount)
  //         : Number(nextPaid.due_amount);
  //
  //     const left_amount =
  //       nextPaid.orders.payment_method_id === 6
  //         ? installmentDto.paymentmethods === Paymentmethods.USD
  //           ? nextPaid.left_amount_usd
  //           : Number(nextPaid.left_amount) /
  //             Number(installmentDto.currency_value)
  //         : installmentDto.paymentmethods === Paymentmethods.USD
  //         ? nextPaid.left_amount_usd
  //         : nextPaid.left_amount;
  //
  //     console.log(
  //       'money: ' +
  //         money +
  //         ' paymentmethods: ' +
  //         installmentDto.paymentmethods +
  //         ' amount ' +
  //         amount +
  //         '  left_amount ' +
  //         left_amount +
  //         ' payment_method_id ' +
  //         nextPaid.orders.payment_method_id,
  //     );
  //     if (money >= amount) {
  //       if (!left_amount) {
  //         await CreditTable.update(
  //           { id: nextPaid.id },
  //           {
  //             status: 'paid',
  //             left_amount: 0,
  //             left_amount_usd: 0,
  //             currency_value: installmentDto.currency_value,
  //             paid_amount: money,
  //             // usd_due_amount: amount_usd,
  //           },
  //         );
  //         money -= Math.round(Number(amount));
  //       } else {
  //         await CreditTable.update(
  //           { id: nextPaid.id },
  //           {
  //             status: 'paid',
  //             left_amount: 0,
  //             left_amount_usd: 0,
  //             currency_value: installmentDto.currency_value,
  //             paid_amount: money,
  //             //usd_due_amount: amount_usd,
  //           },
  //         );
  //         money -= Math.round(Number(left_amount));
  //       }
  //     } else {
  //       if (!left_amount) {
  //         await CreditTable.update(
  //           { id: nextPaid.id },
  //           {
  //             status:
  //               Math.round(Number(amount) - money) > 0 ? 'waiting' : 'paid',
  //             left_amount:
  //               nextPaid.orders.payment_method_id === 6
  //                 ? installmentDto.paymentmethods === Paymentmethods.USD
  //                   ? Math.round(
  //                       Number(amount * installmentDto.currency_value) -
  //                         Number(money * installmentDto.currency_value),
  //                     )
  //                   : Math.round(Number(amount) - Number(money))
  //                 : installmentDto.paymentmethods === Paymentmethods.USD
  //                 ? Math.round(
  //                     Number(amount * installmentDto.currency_value) -
  //                       Number(money * installmentDto.currency_value),
  //                   )
  //                 : Math.round(Number(amount) - Number(money)),
  //             left_amount_usd:
  //               nextPaid.orders.payment_method_id === 6
  //                 ? installmentDto.paymentmethods === Paymentmethods.USD
  //                   ? Math.round(Number(amount) - Number(money))
  //                   : Math.round(
  //                       Number(amount / installmentDto.currency_value) -
  //                         Number(money / installmentDto.currency_value),
  //                     )
  //                 : installmentDto.paymentmethods === Paymentmethods.USD
  //                 ? Math.round(Number(amount) - Number(money))
  //                 : Math.round(
  //                     Number(amount / installmentDto.currency_value) -
  //                       Number(money / installmentDto.currency_value),
  //                   ),
  //             currency_value: installmentDto.currency_value,
  //             paid_amount: money,
  //           },
  //         );
  //         break;
  //       } else {
  //         if (money >= Number(left_amount)) {
  //           await CreditTable.update(
  //             { id: nextPaid.id },
  //             {
  //               status:
  //                "paid",
  //               left_amount: 0,
  //               left_amount_usd: 0,
  //               currency_value: Number(installmentDto.currency_value),
  //               paid_amount: money,
  //             },
  //           );
  //           money -= Number(left_amount);
  //         } else {
  //           await CreditTable.update(
  //             { id: nextPaid.id },
  //             {
  //               status: 'paid',
  //               // Math.round(Number(money <= Number(left_amount))) > 0
  //               //   ? 'waiting':
  //               left_amount: Math.round(Number(left_amount) - Number(money)),
  //               left_amount_usd: Math.round(
  //                 Number(left_amount / installmentDto.currency_value) -
  //                   Number(money / installmentDto.currency_value),
  //               ),
  //               currency_value: installmentDto.currency_value,
  //               paid_amount: money,
  //             },
  //           );
  //           money = 0;
  //           break;
  //         }
  //       }
  //     }
  //   }
  //
  //   return await this.doPayment(installmentDto);
  // }

  public async updatepayForInstallment(id:number,installmentDto: NewPaymentDto) {
    await Payments.delete({ id: id });
    await this.doPaymentUpdate(installmentDto);

    // const orders = await Orders.findOne({
    //   where: { id: installmentDto.order_id },
    // });
    const payment = await this.paymentRepo.manager
      .getRepository(Payments)
      .createQueryBuilder('payments')
      .select('SUM(payments.amount)', 'amount')
      .addSelect('SUM(payments.amount_usd)', 'amount_usd')
      .where('payments.order_id=:order_id', {
        order_id: installmentDto.order_id,
      })
      .andWhere('payments.credit_table_id=:credit_table_id', {
        credit_table_id: installmentDto.credit_table_id,
      })
      .getRawOne();

    if (installmentDto.credit_table_id != 0) {
      // Kiritilgan summa (so'mda)
      let money =
        installmentDto.paymentmethods === Paymentmethods.USD
          ? Math.round(
              Number(payment.amount) * Number(installmentDto.currency_value),
            )
          : Math.round(Number(payment.amount));

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
    }
    console.log("To'lov jarayoni yakunlandi.");
    // return await this.doPayment(installmentDto);

    // let money =
    //   installmentDto.paymentmethods === Paymentmethods.USD
    //     ? Math.round(
    //         Math.abs(Number(payment.amount - orders.initial_pay)) *
    //           Number(installmentDto.currency_value),
    //       )
    //     : Math.abs(Number(payment.amount - orders.initial_pay));
    //
    // console.log(money);
    // while (money > 0) {
    //   const nextPaid = await CreditTable.findOne({
    //     where: { order_id: installmentDto.order_id, status: 'waiting' },
    //     order: { due_date: 'ASC' },
    //   });
    //
    //   if (!nextPaid) {
    //     break;
    //   }
    //   const amount_usd = Math.round(
    //     Math.round(Number(nextPaid.due_amount)) /
    //       Math.round(Number(installmentDto.currency_value)),
    //   );
    //
    //   if (money >= nextPaid.due_amount) {
    //     if (!nextPaid.left_amount) {
    //       await CreditTable.update(
    //         { id: nextPaid.id },
    //         {
    //           status: 'paid',
    //           left_amount: 0,
    //           currency_value: installmentDto.currency_value,
    //           // usd_due_amount: amount_usd,
    //         },
    //       );
    //       money -= Math.round(Number(nextPaid.due_amount));
    //     } else {
    //       await CreditTable.update(
    //         { id: nextPaid.id },
    //         {
    //           status: 'paid',
    //           left_amount: 0,
    //           currency_value: installmentDto.currency_value,
    //           //    usd_due_amount: amount_usd,
    //         },
    //       );
    //       money -= Math.round(Number(nextPaid.left_amount));
    //     }
    //   } else {
    //     if (!nextPaid.left_amount) {
    //       await CreditTable.update(
    //         { id: nextPaid.id },
    //         {
    //           status:
    //             Math.round(Number(nextPaid.due_amount) - money) > 0
    //               ? 'waiting'
    //               : 'paid',
    //           left_amount: Math.round(Number(nextPaid.due_amount) - money),
    //           currency_value: installmentDto.currency_value,
    //           // usd_due_amount: Math.round(
    //           //   (Number(nextPaid.due_amount) - money) /
    //           //     Number(installmentDto.currency_value),
    //           // ),
    //         },
    //       );
    //       break;
    //     } else {
    //       if (money >= nextPaid.left_amount) {
    //         await CreditTable.update(
    //           { id: nextPaid.id },
    //           {
    //             status: 'paid',
    //             left_amount: 0,
    //             currency_value: Number(installmentDto.currency_value),
    //             // usd_due_amount: amount_usd,
    //           },
    //         );
    //         money -= nextPaid.left_amount;
    //       } else {
    //         await CreditTable.update(
    //           { id: nextPaid.id },
    //           {
    //             status: 'paid',
    //             left_amount: Math.round(Number(nextPaid.left_amount) - money),
    //             currency_value: installmentDto.currency_value,
    //             // usd_due_amount: Math.round(
    //             //   (Number(nextPaid.left_amount) - money) /
    //             //     Number(installmentDto.currency_value),
    //             // ),
    //           },
    //         );
    //         break;
    //       }
    //     }
    //   }
    // }
    // return await this.doPaymentUpdate(installmentDto);
  }

  public async updatepayForInstallment2(installmentDto: NewPaymentDto) {
    const orders = await Orders.findOne({
      where: { id: installmentDto.order_id },
    });

    const payment = await this.paymentRepo.manager
      .getRepository(Payments)
      .createQueryBuilder('payments')
      .select('SUM(payments.amount)', 'amount')
      .addSelect('SUM(payments.amount_usd)', 'amount_usd')
      .where('payments.order_id=:order_id', {
        order_id: installmentDto.order_id,
      })
      .getRawOne();

    let money =
      installmentDto.paymentmethods === Paymentmethods.USD
        ? Math.round(
            Math.abs(Number(payment.amount - orders.initial_pay)) *
              Number(installmentDto.currency_value),
          )
        : Math.abs(Number(payment.amount - orders.initial_pay));
    while (money > 0) {
      const nextPaid = await CreditTable.findOne({
        where: { order_id: installmentDto.order_id, status: 'waiting' },
        order: { due_date: 'ASC' },
      });

      if (!nextPaid) {
        break;
      }
      const amount_usd = Math.round(
        Math.round(Number(nextPaid.due_amount)) /
          Math.round(Number(installmentDto.currency_value)),
      );

      if (money >= nextPaid.due_amount) {
        if (!nextPaid.left_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            {
              status: 'paid',
              left_amount: 0,
              currency_value: installmentDto.currency_value,
              // usd_due_amount: amount_usd,
            },
          );
          money -= Math.round(Number(nextPaid.due_amount));
        } else {
          await CreditTable.update(
            { id: nextPaid.id },
            {
              status: 'paid',
              left_amount: 0,
              currency_value: installmentDto.currency_value,
              //    usd_due_amount: amount_usd,
            },
          );
          money -= Math.round(Number(nextPaid.left_amount));
        }
      } else {
        if (!nextPaid.left_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            {
              status:
                Math.round(Number(nextPaid.due_amount) - money) > 0
                  ? 'waiting'
                  : 'paid',
              left_amount: Math.round(Number(nextPaid.due_amount) - money),
              currency_value: installmentDto.currency_value,
              // usd_due_amount: Math.round(
              //   (Number(nextPaid.due_amount) - money) /
              //     Number(installmentDto.currency_value),
              // ),
            },
          );
          break;
        } else {
          if (money >= nextPaid.left_amount) {
            await CreditTable.update(
              { id: nextPaid.id },
              {
                status: 'paid',
                left_amount: 0,
                currency_value: Number(installmentDto.currency_value),
                // usd_due_amount: amount_usd,
              },
            );
            money -= nextPaid.left_amount;
          } else {
            await CreditTable.update(
              { id: nextPaid.id },
              {
                status: 'paid',
                left_amount: Math.round(Number(nextPaid.left_amount) - money),
                currency_value: installmentDto.currency_value,
                // usd_due_amount: Math.round(
                //   (Number(nextPaid.left_amount) - money) /
                //     Number(installmentDto.currency_value),
                // ),
              },
            );
            break;
          }
        }
      }
    }
    // return await this.doPaymentUpdate(installmentDto);
  }
  async doUpdatePayment(id: number, payDto: NewPaymentDto) {
    const queryRunner = this.paymentRepo.manager.connection.createQueryRunner();
    queryRunner.startTransaction();
    let amountToUsd, amountToUzs;
    let credit_tb_id: number;
    // eslint-disable-next-line prefer-const
    credit_tb_id = payDto.credit_table_id;
    try {
      if (payDto.paymentmethods === Paymentmethods.USD) {
        amountToUsd = payDto.amount;
        amountToUzs = Math.floor(payDto.amount * payDto.currency_value);
      } else {
        amountToUsd = Math.floor(payDto.amount / payDto.currency_value);
        amountToUzs = payDto.amount;
      }

      const payment = new Payments();
      payment.orders = await Orders.findOne({
        where: { id: +payDto.order_id },
      });
      payment.users = await Users.findOne({ where: { id: +payDto.user_id } });
      payment.amount = amountToUzs;
      payment.amount_usd = amountToUsd;
      payment.currency_value = payDto.currency_value;
      payment.payment_date = payDto.payment_date;
      payment.paymentmethods = payDto.paymentmethods;
      payment.caishers = await Caisher.findOne({
        where: { id: payDto.caisher_id },
      });
      payment.caisher_type = payDto.caishertype;
      payment.pay_note = payDto.pay_note;
      payment.payment_status = PaymentStatus.PAID;
      payment.credit_table_id = credit_tb_id
        ? credit_tb_id
        : await CreditTable.findOne({
            where: { order_id: payDto.order_id, status: 'waiting' },
            order: { id: 'asc' },
          }).then((res) => {
            return res?.id ? res.id : null;
          });
      await queryRunner.commitTransaction();
      return await this.paymentRepo.update({ id: id }, payment);
    } catch (error) {
      console.log(error.message);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async doPayment(payDto: NewPaymentDto) {
    const queryRunner = this.paymentRepo.manager.connection.createQueryRunner();
    queryRunner.startTransaction();
    let amountToUsd, amountToUzs;
    let credit_tb_id: number;

    // eslint-disable-next-line prefer-const
    credit_tb_id = payDto.credit_table_id;
    try {
      if (payDto.paymentmethods === Paymentmethods.USD) {
        amountToUsd = payDto.amount;
        amountToUzs = Math.round(Number(payDto.amount) *  Number(payDto.currency_value));
      } else {
        amountToUsd = Math.round(
          Number(payDto.amount) / Number(payDto.currency_value),
        );
        amountToUzs = payDto.amount;
      }

      const payment = new Payments();
      payment.orders = await Orders.findOne({
        where: { id: +payDto.order_id },
      });
      payment.users = await Users.findOne({ where: { id: +payDto.user_id } });
      payment.amount = amountToUzs;
      payment.amount_usd = amountToUsd;
      payment.currency_value = payDto.currency_value;
      payment.payment_date = payDto.payment_date;
      payment.paymentmethods = payDto.paymentmethods;
      payment.caishers = await Caisher.findOne({
        where: { id: payDto.caisher_id },
      });
      payment.caisher_type = payDto.caishertype;
      payment.pay_note = payDto.pay_note;
      payment.payment_status = PaymentStatus.PAID;
      payment.credit_table_id = credit_tb_id
        ? credit_tb_id
        : await CreditTable.findOne({
            where: { order_id: payDto.order_id, status: 'waiting' },
            order: { id: 'asc' },
          }).then((res) => {
            return res?.id ? res.id : null;
          });
      await queryRunner.commitTransaction();
      return await this.paymentRepo.save(payment);
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
  async doPaymentUpdate(payDto: NewPaymentDto) {
    const queryRunner = this.paymentRepo.manager.connection.createQueryRunner();
    queryRunner.startTransaction();
    let amountToUsd, amountToUzs;
    let credit_tb_id: number;

    // eslint-disable-next-line prefer-const
    credit_tb_id = payDto.credit_table_id;
    try {
      if (payDto.paymentmethods === Paymentmethods.USD) {
        amountToUsd = payDto.amount;
        amountToUzs = Math.floor(payDto.amount * payDto.currency_value);
      } else {
        amountToUsd = Math.floor(payDto.amount / payDto.currency_value);
        amountToUzs = payDto.amount;
      }

      const payment = new Payments();
      payment.orders = await Orders.findOne({
        where: { id: +payDto.order_id },
      });
      payment.users = await Users.findOne({ where: { id: +payDto.user_id } });
      payment.amount = amountToUzs;
      payment.amount_usd = amountToUsd;
      payment.currency_value = payDto.currency_value;
      payment.payment_date = payDto.payment_date;
      payment.paymentmethods = payDto.paymentmethods;
      payment.caishers = await Caisher.findOne({
        where: { id: payDto.caisher_id },
      });
      payment.caisher_type = payDto.caishertype;
      payment.pay_note = payDto.pay_note;
      payment.payment_status = PaymentStatus.PAID;
      payment.credit_table_id = credit_tb_id;
      await queryRunner.commitTransaction();
      return await this.paymentRepo.save(payment);
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
