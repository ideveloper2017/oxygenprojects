import {Injectable} from '@nestjs/common';
import {OrdersService} from "../orders/orders.service";
import {InjectRepository} from "@nestjs/typeorm";
import {Orders} from "../orders/entities/order.entity";
import {Repository, SelectQueryBuilder} from "typeorm";

@Injectable()
export class ReportService {

    constructor(
        @InjectRepository(Orders)
        private readonly orderRepo: Repository<Orders>,
        private readonly orderService: OrdersService) {
    }


    public async getListOfDebitors() {
        const usersWithTransactionSum = await this.orderRepo.createQueryBuilder('orders')


            .getRawMany()

        return usersWithTransactionSum;
    }

}