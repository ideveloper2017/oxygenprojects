import { Injectable } from '@nestjs/common';
import { NewPaymentDto } from './dto/create-payment.dto';
import { Repository } from 'typeorm';
import { Payments } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdatePaymentDto } from './dto/update-payment.dto';

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

    // while(check) {

    //   console.log('inside of if:');

    //     let lastPaid = await CreditTable.findOne({where: {status: 'waiting'}, order: {'due_date':'ASC' }})
    //     // console.log(lastPaid.due_amount-lastPaid.left_amount);
    //     const leftAmount = money - (lastPaid.due_amount - lastPaid.left_amount)

    //     // break
    //     if(leftAmount > 0 ){
    //       console.log(leftAmount);

    //       if(leftAmount >= lastPaid.due_amount){

    //         await CreditTable.update({id: lastPaid.id}, {status: 'paid', left_amount: 0})
    //         money -= lastPaid.due_amount
    //         check = 1

    //       }else {

    //         await CreditTable.update({id: lastPaid.id}, {left_amount: lastPaid.due_amount - leftAmount })
    //         money-= leftAmount
    //         check =1

    //       }
    //     }else {
    //       await CreditTable.update({id: lastPaid.id}, {left_amount:lastPaid.due_amount - leftAmount})
    //       // money-= lastPaid.left_amount
    //       break
    //     }
    //   }
    // console.log(leftAmount);
    if (paymentMethods.name.toLowerCase() == 'rassrochka') {
      const check = 1;
      let money = newPaymentDto.amount;
      while (money > 0) {
        const nextPaid = await CreditTable.findOne({
          where: { status: 'waiting' },
          order: { due_date: 'ASC' },
        });

        if (!nextPaid) {
          break; // No more unpaid installments, exit the loop
        }

        if (money >= nextPaid.due_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            { status: 'paid', left_amount: 0 },
          );
          money -= nextPaid.due_amount;
        } else {
          await CreditTable.update(
            { id: nextPaid.id },
            { left_amount: +(nextPaid.due_amount - money).toFixed() },
          );
          money = 0;
        }
      }
      const payment = new Payments();
      payment.order_id = newPaymentDto.order_id;
      payment.amount = newPaymentDto.amount;
      payment.payment_date = new Date();
      // payment.by_card = newPaymentDto.by_card;
      // payment.in_cash = newPaymentDto.in_cash;
      // payment.bank = newPaymentDto.bank;

      newPay = await this.paymentRepo.save(payment);
    } else {
      const payment = new Payments();
      payment.order_id = newPaymentDto.order_id;
      payment.amount = newPaymentDto.amount;
      payment.payment_date = new Date();
      // payment.paymentmehotd=newPaymentDto

      newPay = await this.paymentRepo.save(payment);
    }
    return newPay;
  }

  async getAll() {
    return await this.paymentRepo.find({
      relations: ['orders'],
      order: { id: 'desc' },
    });
  }

  async update(id: number, newPaymentDto: UpdatePaymentDto) {
    return await this.paymentRepo.update({ id: id }, newPaymentDto);
  }

  async delete(id: number) {
    return this.paymentRepo.delete({ id: id });
  }
}
