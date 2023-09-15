import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orders } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentMethods } from '../payment-method/entities/payment-method.entity';
import { OrderItems } from '../order-items/entities/order-item.entity';
import { Apartments } from '../apartments/entities/apartment.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import {Clients} from "../clients/entities/client.entity";
import {Users} from "../users/entities/user.entity";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Orders)
    private readonly ordersRepository: Repository<Orders>,
  ) {}

  async getLastID() {
    return await this.ordersRepository
      .createQueryBuilder('orders')
      .orderBy('id', 'DESC')
      .getOne();
  }

  async createOrder(createOrderDto: CreateOrderDto) {
    // const apartment = await this.ordersRepository.this.ordersRepository.manager.getRepository(Apartments).findOne({where: {id: createOrderDto.apartment_id}, relations: ['floor.entrance.buildings']})

    const payment_method = await this.ordersRepository.manager
      .getRepository(PaymentMethods)
      .findOne({ where: { id: createOrderDto.payment_method_id } });

    let client_id,user_id;
    client_id=await this.ordersRepository.manager.getRepository(Clients).find({where:{id:createOrderDto.client_id}})
         .then((data)=>{
           data.map(data=>{
             return data.id
           })
         });

    user_id=await this.ordersRepository.manager.getRepository(Users).find({where:{id:createOrderDto.user_id}}).then((data)=>{
            data.map(data=>{
              return data.id;
            })
    })
    const order = new Orders();
    order.clients = client_id;
    order.users = user_id;
    order.payment_method_id = createOrderDto.payment_method_id;
    order.order_status = createOrderDto.order_status;
    order.order_date = new Date();
    order.total_amount = 145200000;
    order.quantity = createOrderDto.apartments.length;
    order.is_accepted = createOrderDto.is_accepted;
    const savedOrder = await this.ordersRepository.save(order);

    const orderItem = new OrderItems();
    orderItem.order_id = savedOrder.id;
    orderItem.apartment_id = createOrderDto.apartment_id;

    const saveOrderItem = await this.ordersRepository.manager
      .getRepository(OrderItems)
      .save(orderItem);

    const apartment = await this.ordersRepository.manager
      .getRepository(Apartments)
      .findOne({
        where: { id: saveOrderItem.apartment_id },
        relations: ['floor.entrance.buildings'],
      });

    // binodagi barcha apartmentlarga tegishli narxini olish
    const total =
      apartment.floor.entrance.buildings.mk_price * apartment.room_space;

    // umumiy qiymatni to'lov muddatiga bo'lgandagi bir oylik to'lov
    const oneMonthDue =
      (total - createOrderDto.initial_pay) / createOrderDto.installment_month;

    if (payment_method.name.toLowerCase() === 'rassrochka') {
      const creditSchedule = [];
      const date = new Date();

      for (let i = 1; i <= createOrderDto.installment_month; i++) {
        const mon = new Date(date.setMonth(date.getMonth() + 1));

        const installment = new CreditTable();
        installment.order_id = savedOrder.id;
        installment.due_amount = +oneMonthDue.toFixed(2);
        installment.due_date = mon;
        installment.status = 'waiting';
        creditSchedule.push(installment);
      }

      const schedule = await this.ordersRepository.manager
        .getRepository(CreditTable)
        .save(creditSchedule);
    }

    const updatedOrder = await this.ordersRepository.update(
      { id: savedOrder.id },
      { total_amount: total },
    );

    return updatedOrder;
  }

  async getOrderList(id: number) {
    let order;
    if (id == 0) {
      order = await this.ordersRepository.find({relations: ['clients','users']});
    } else {
      order = await this.ordersRepository.findOne({
        where: { id: id },
        relations: ['apartments', 'apartments.floor.entrance.buildings'],
      });
    }
    return order;
  }

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.ordersRepository.update(
      { id: id },
      updateOrderDto,
    );
    return order;
  }

  async deleteOrder(arrayOfId: number[]) {
    for (const id of arrayOfId) {
      await this.ordersRepository.delete({ id: id });
    }

    return arrayOfId.length;
  }

  async chooseOrder(id: number) {
    const order = await this.ordersRepository.update(
      { id: id },
      { is_accepted: true },
    );
    return order;
  }
}
