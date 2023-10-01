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

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payments)
    private readonly paymentRepo: Repository<Payments>,
  ) {}

  async newPayment(newPaymentDto: NewPaymentDto) {

    const { paymentMethods } = await Orders.findOne({
      where: { id: newPaymentDto.order_id },
      relations: ['paymentMethods'],
    });

    let newPay;

    if (
      paymentMethods.name_alias.toLowerCase() == 'rassrochka' ||
      paymentMethods.name_alias.toLowerCase() == 'ipoteka'
    ) {
      let money = newPaymentDto.amount;
      while (money > 0) {
        const nextPaid = await CreditTable.findOne({
          where: { order_id: newPaymentDto.order_id, status: 'waiting' },
          order: { due_date: 'ASC' },
        });

        if (!nextPaid) {
          break;
        }

        if (money >= nextPaid.due_amount) {
          if (!nextPaid.left_amount) {
            await CreditTable.update(
              { id: nextPaid.id },
              { status: 'paid', left_amount: 0 },
            );
            money -= nextPaid.due_amount;
          } else {
            await CreditTable.update(
              { id: nextPaid.id },
              { status: 'paid', left_amount: 0 },
            );
            money -= nextPaid.left_amount;
          }
        } else {
          if (!nextPaid.left_amount) {
            await CreditTable.update(
              { id: nextPaid.id },
              { left_amount: +(nextPaid.due_amount - money).toFixed(2) },
            );
            break;
          } else {
            if (money >= nextPaid.left_amount) {
              await CreditTable.update(
                { id: nextPaid.id },
                { status: 'paid', left_amount: 0 },
              );
              money -= nextPaid.left_amount;
            } else {
              await CreditTable.update(
                { id: nextPaid.id },
                { left_amount: +(nextPaid.left_amount - money).toFixed(2) },
              );
              break;
            }
          }
        }
      }

      const payment = new Payments();
      payment.orders = await Orders.findOne({
        where: { id: +newPaymentDto.order_id },
      });
      payment.users = await Users.findOne({
        where: { id: +newPaymentDto.user_id },
      });
      payment.amount = newPaymentDto.amount;
      payment.amount_usd = newPaymentDto.amount_usd ? newPaymentDto.amount_usd : +(newPaymentDto.amount/newPaymentDto.currency_value).toFixed(2);
      payment.currency_value = newPaymentDto.currency_value;
      payment.payment_date = new Date();
      payment.paymentmethods = newPaymentDto.paymentmethods;
      payment.caishers = await Caisher.findOne({
        where: { id: newPaymentDto.caisher_id },
      });
      payment.caisher_type = newPaymentDto.caishertype;
      payment.pay_note = newPaymentDto.pay_note;
      payment.payment_status = PaymentStatus.PAID;
      newPay = await this.paymentRepo.save(payment);

    } else {
      
      const payment = new Payments();
      payment.orders = await Orders.findOne({
        where: { id: newPaymentDto.order_id },
      });
      payment.users = await Users.findOne({
        where: { id: +newPaymentDto.user_id },
      });
      payment.amount = newPaymentDto.amount;
      payment.amount_usd = newPaymentDto.amount_usd;
      payment.currency_value = newPaymentDto.currency_value;
      payment.payment_date = new Date();
      payment.paymentmethods = newPaymentDto.paymentmethods;
      payment.caishers = await Caisher.findOne({
        where: { id: newPaymentDto.caisher_id },
      });
      newPay = await this.paymentRepo.save(payment);
      payment.caisher_type = newPaymentDto.caishertype;
      payment.pay_note = newPaymentDto.pay_note;
      payment.payment_status = PaymentStatus.PAID;

      newPay = await this.paymentRepo.save(payment);
    }
    
    if(newPaymentDto.is_completed){
      await Orders.update({id: newPaymentDto.order_id}, {order_status: OrderStatus.COMPLETED})
    }
    return newPay;
  }

  async getAllPayments(offset: number, limit: number) {
    const orders = await this.paymentRepo.find({
      relations: ['orders', 'orders.clients', 'caishers'],
      skip: offset,
      take: limit,
      order: { id: 'desc' },
    });
    return orders;
  }

  async update(id: number, newPaymentDto: UpdatePaymentDto) {
    return await this.paymentRepo.update({ id: id }, newPaymentDto);
  }

  async deletePayment(arrayOfId: number[]) {
    let counter = 0;
    for (const i of arrayOfId) {
      counter += (await this.paymentRepo.update({ id: i },{ is_deleted: true })).affected
    }

    return counter;
  }

  async recoverPayment (arrayOfId: number[]) {
    let counter = 0 
    for(let i of arrayOfId) {
      counter += (await this.paymentRepo.update({id: i}, {is_deleted: false})).affected
      }
      return counter     
  }


  public async checkOrderIsCompleted(order_id: number){
      
  }
}
