import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditTable } from './entities/credit-table.entity';
import { Orders } from '../orders/entities/order.entity';
import { Payments } from '../payments/entities/payment.entity';
import { Caishertype } from 'src/common/enums/caishertype';

@Injectable()
export class CreditTableService {
  constructor(
    @InjectRepository(CreditTable)
    private readonly creditTableRepo: Repository<CreditTable>,
  ) {}

  async getCreditTableOfClient(order_id: number) {
    const order = await Orders.findOne({
      where: { id: order_id },
      relations: [
        'clients',
        'users',
        'payments',
        'paymentMethods',
        'orderItems.apartments.floor.entrance.buildings.towns',
        'creditTables',
      ],
      order: { creditTables: { due_date: 'ASC' } },
    });

    if (!order) throw new Error('Order not found');

    // To'lovlar balansini hisoblash
    const { incomingSum, outgoingSum } = order.payments.reduce(
      (acc, curr) => {
        if (curr.caisher_type === Caishertype.IN) {
          acc.incomingSum += +curr.amount;
        } else {
          acc.outgoingSum += +curr.amount;
        }
        return acc;
      },
      { incomingSum: 0, outgoingSum: 0 },
    );
    order['sumOfpayments'] = incomingSum - outgoingSum;

    // CreditTable'ga bog'langan payment'larni guruhlab chiqish
    const creditTablesWithPayments = order.creditTables.map((credit) => {
      const paymentsForThisCredit = order.payments.filter(
        (payment) => payment.credit_table_id === credit.id,
      );

      const totalPaid = paymentsForThisCredit.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );

      return {
        ...credit,
        totalPaid,
        remaining: Number(credit.due_amount) - totalPaid,
      };
    });

    // Orqaga kreditlar va umumiy balansni yuborish
    return {
      ...order,
      creditTables: creditTablesWithPayments,
    };
  }

  // async getCreditTableOfClient(order_id: number) {
  //
  //   let order;
  //   order = await Orders.findOne({
  //     where: { id: order_id },
  //     relations: [
  //       'clients',
  //       'users',
  //       'payments',
  //       'paymentMethods',
  //       'orderItems.apartments.floor.entrance.buildings.towns',
  //       'creditTables',
  //     ],
  //     order: { creditTables: { due_date: 'ASC' } },
  //   });
  //
  //
  //   const { incomingSum, outgoingSum } = order['payments'].reduce(
  //     (accumulator, currentValue) => {
  //       currentValue.caisher_type === Caishertype.IN
  //         ? (accumulator.incomingSum += +currentValue.amount)
  //         : (accumulator.outgoingSum += +currentValue.amount);
  //       return accumulator;
  //     },
  //     { incomingSum: 0, outgoingSum: 0 },
  //     );
  //
  //     order['sumOfpayments'] = incomingSum - outgoingSum;
  //
  //   return order;
  // }
}
