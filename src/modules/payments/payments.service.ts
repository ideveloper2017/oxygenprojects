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

      newPaymentDto.credit_table_id = credit_tb_id.id;

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

      if (
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

          console.log({
            total_amount: total_amount,
            total_amount_usd: incomingSum_usd,
            order_status: OrderStatus.COMPLETED,
          });

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
      await Payments.delete({ id: id });

      const { paymentMethods } = await Orders.findOne({
        where: { id: newPaymentDto.order_id },
        relations: ['paymentMethods'],
      });
      //await Payments.delete({ id: id });
      const usdRate = await ExchangRates.findOne({
        where: { is_default: true },
      });

      await CreditTable.update(
        { order_id: newPaymentDto.order_id },
        { status: 'waiting', left_amount: 0 },
      );
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
          paymentMethods.name_alias.toLowerCase() == 'subsidia') &&
        newPaymentDto.caishertype === Caishertype.IN
      ) {
        newPay = await this.updatepayForInstallment(newPaymentDto);
      } else {
        newPay = await this.doUpdatePayment(id, newPaymentDto);
      }

      if (
        newPaymentDto.is_completed &&
        newPaymentDto.caishertype === Caishertype.IN
      ) {
        await Orders.update(
          { id: newPaymentDto.order_id },
          { order_status: OrderStatus.COMPLETED },
        );
        await OrderItems.update(
          { order_id: newPaymentDto.order_id },
          { order_status: OrderStatus.COMPLETED },
        );
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
    let money =
      installmentDto.paymentmethods === Paymentmethods.USD
        ? Math.round(Number(installmentDto.amount))
        : Number(installmentDto.amount);

    while (money > 0) {
      const nextPaid = await CreditTable.findOne({
        where: { order_id: installmentDto.order_id, status: 'waiting' },
        order: { due_date: 'ASC' },
        relations: ['orders'],
      });

      if (!nextPaid) {
        break;
      }
      const amount =
        nextPaid.orders.payment_method_id === 6
          ? nextPaid.usd_due_amount
          : nextPaid.due_amount;

      const left_amount =
        nextPaid.orders.payment_method_id === 6
          ? nextPaid.left_amount_usd
          : nextPaid.left_amount;

      if (money >= amount) {
        if (!left_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            {
              status: 'paid',
              left_amount: 0,
              left_amount_usd:0,
              currency_value: installmentDto.currency_value,
              paid_amount: money,
              // usd_due_amount: amount_usd,
            },
          );
          money -= Math.round(Number(amount));
        } else {
          await CreditTable.update(
            { id: nextPaid.id },
            {
              status: 'paid',
              left_amount: 0,
              left_amount_usd: 0,
              currency_value: installmentDto.currency_value,
              paid_amount: money,
              //usd_due_amount: amount_usd,
            },
          );
          money -= Math.round(Number(left_amount));
        }
      } else {
        if (!left_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            {
              status:
                Math.round(
                  Number(amount) - money,
                ) > 0
                  ? 'waiting'
                  : 'paid',
              left_amount: (nextPaid.orders.payment_method_id === 6)? Math.round(Number(amount*installmentDto.currency_value) - Number(money*installmentDto.currency_value)):Math.round(Number(amount) - Number(money)),
              left_amount_usd: (nextPaid.orders.payment_method_id === 6)? Math.round(Number(amount) - Number(money)):Math.round(Number(amount/installmentDto.currency_value) - Number(money/installmentDto.currency_value)),
              currency_value: installmentDto.currency_value,
              paid_amount: money,
            },
          );
          break;
        } else {
          if (money >= Number(left_amount)) {
            await CreditTable.update(
              { id: nextPaid.id },
              {
                status: 'paid',
                left_amount: 0,
                left_amount_usd: 0,
                currency_value: Number(installmentDto.currency_value),
                paid_amount: money,

              },
            );
            money -= Number(left_amount);
          } else {
            await CreditTable.update(
              { id: nextPaid.id },
              {
                status: 'paid',
                left_amount: Math.round(Number(left_amount* installmentDto.currency_value) - Number(money* installmentDto.currency_value)),
                left_amount_usd: Math.round(Number(left_amount) - Number(money)),
                currency_value: installmentDto.currency_value,
                paid_amount: money,
              },
            );
            break;
          }
        }
      }
    }
    return await this.doPayment(installmentDto);
  }

  public async updatepayForInstallment(installmentDto: NewPaymentDto) {
    await this.doPaymentUpdate(installmentDto);

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

    console.log(money);
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
    // const payments = await this.paymentRepo.createQueryBuilder('payments')
    // .leftJoin('payments.orders', 'order')
    // .addSelect('SUM(payments.amount)', 'sumPayment')
    // .addSelect('order.total_amount', 'total_amount')
    // .where('order.id = :id', {id: payDto.order_id})
    // .groupBy('payments.id')
    // .getRawMany()
    // console.log(payments[0].sumPayment,payments[0].total_amount );

    const queryRunner = this.paymentRepo.manager.connection.createQueryRunner();
    queryRunner.startTransaction();
    let amountToUsd, amountToUzs;

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
      return await this.paymentRepo.save(payment);
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
  async doPaymentUpdate(payDto: NewPaymentDto) {
    // const payments = await this.paymentRepo.createQueryBuilder('payments')
    // .leftJoin('payments.orders', 'order')
    // .addSelect('SUM(payments.amount)', 'sumPayment')
    // .addSelect('order.total_amount', 'total_amount')
    // .where('order.id = :id', {id: payDto.order_id})
    // .groupBy('payments.id')
    // .getRawMany()
    // console.log(payments[0].sumPayment,payments[0].total_amount );

    const queryRunner = this.paymentRepo.manager.connection.createQueryRunner();
    queryRunner.startTransaction();
    let amountToUsd, amountToUzs;

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
