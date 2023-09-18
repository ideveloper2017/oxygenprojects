import { Injectable } from '@nestjs/common';
import { NewPaymentDto } from './dto/create-payment.dto';
import { Repository } from 'typeorm';
import { Payments } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Caisher } from '../caisher/entities/caisher.entity';

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

    if (paymentMethods.name.toLowerCase() == 'rassrochka') {
      const check = 1;
      let money = newPaymentDto.amount;
      while (money > 0) {
        const nextPaid = await CreditTable.findOne({
          where: { status: 'waiting' },
          order: { due_date: 'ASC' },
        });

        if (!nextPaid) {
          break;
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
      payment.paymentmethod = newPaymentDto.paymentmethod;
      payment.caishers = await Caisher.findOne({
        where: { id: newPaymentDto.caisher_id },
      });

      newPay = await this.paymentRepo.save(payment);
    } else {
      const payment = new Payments();
      payment.order_id = newPaymentDto.order_id;
      payment.amount = newPaymentDto.amount;
      payment.payment_date = new Date();
      payment.paymentmethod = newPaymentDto.paymentmethod;
      payment.caishers = await Caisher.findOne({
        where: { id: newPaymentDto.caisher_id },
      });
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
