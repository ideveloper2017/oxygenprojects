import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditTable } from './entities/credit-table.entity';

@Injectable()
export class CreditTableService {
  constructor(
    @InjectRepository(CreditTable)
    private readonly creditTableRepo: Repository<CreditTable>,
  ) {}

  async getCreditTableOfClient(order_id: number) {
    const creditTable = await this.creditTableRepo.find({
      where: { order_id: order_id },
    });
    return creditTable;
  }
}
