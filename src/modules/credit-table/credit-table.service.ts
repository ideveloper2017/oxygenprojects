import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditTable } from './entities/credit-table.entity';
import { Orders } from '../orders/entities/order.entity';
import { Payments } from '../payments/entities/payment.entity';

@Injectable()
export class CreditTableService {
  constructor(
    @InjectRepository(CreditTable)
    private readonly creditTableRepo: Repository<CreditTable>,
  ) {}

  async getCreditTableOfClient(order_id: number) {
    // let order;
    // order = await this.creditTableRepo.manager.getRepository(Orders).findOne({
    //   where: { id: order_id },
    //   relations: [
    //     'clients',
    //     'payments',
    //     'users',
    //     'paymentMethods',
    //     'orderItems.apartments.floor.entrance.buildings.towns',
    //   ],
    // });
    //
    // const sum = order['payments'].reduce(
    //   (accumulator, currentValue) => accumulator + Number(currentValue.amount),
    //   0,
    // );
    // order['payments'] = sum;
    // return order;
    const creditTable = await Orders.findOne({
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

    // const sum = creditTable.creditTables.reduce((accumulator, currentValue) => accumulator + currentValue.due_amount, 0)

   //  const payment = await Payments.createQueryBuilder('payment')
   //    .select('SUM(payment.amount)', 'sum')
   //    .where('payment.order_id = :order_id', { order_id })
   //    .getRawOne();
   //
   // // creditTable.payments = payment;

    return creditTable;
  }
}
