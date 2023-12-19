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
    let order;
    order = await Orders.findOne({
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


    const { incomingSum, outgoingSum } = order['payments'].reduce(
      (accumulator, currentValue) => {
        currentValue.caisher_type === Caishertype.IN
          ? (accumulator.incomingSum += +currentValue.amount)
          : (accumulator.outgoingSum += +currentValue.amount);
        return accumulator;
      },
      { incomingSum: 0, outgoingSum: 0 },
      );
      
      order['sumOfpayments'] = incomingSum - outgoingSum;

    return order;
  }
}
