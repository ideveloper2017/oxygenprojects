import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditTable } from './entities/credit-table.entity';
import { Orders } from '../orders/entities/order.entity';

@Injectable()
export class CreditTableService {
  constructor(
    @InjectRepository(CreditTable)
    private readonly creditTableRepo: Repository<CreditTable>,
  ) {}

  async getCreditTableOfClient(order_id: number) {
    const creditTable = await Orders.findOne({where: {id: order_id}, relations: ['creditTables']});
    return creditTable;
 
  }
}
