import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orders } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentMethods } from '../payment-method/entities/payment-method.entity';
import { OrderItems } from '../order-items/entities/order-item.entity';
import { Apartments } from '../apartments/entities/apartment.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Clients } from '../clients/entities/client.entity';
import { Users } from '../users/entities/user.entity';
import { PaymentsService } from '../payments/payments.service';
import { Caisher } from '../caisher/entities/caisher.entity';
import { Caishertype } from 'src/common/enums/caishertype';
import { Paymentmethods } from 'src/common/enums/paymentmethod';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Orders)
    private readonly ordersRepository: Repository<Orders>,
    private readonly paymentService: PaymentsService
  ) { }

  async getLastID() {
    return await this.ordersRepository
      .createQueryBuilder('orders')
      .orderBy('id', 'DESC')
      .getOne();
  }

  async createOrder(createOrderDto: CreateOrderDto) {

    const payment_method = await this.ordersRepository.manager
      .getRepository(PaymentMethods)
      .findOne({ where: { id: +createOrderDto.payment_method_id } });

      const checkApartment = await Apartments.findOne({ where: { id: +createOrderDto.apartment_id} });
      if(checkApartment.status === 'sold') {
        throw new HttpException('Xonadon allaqachon sotilgan', HttpStatus.BAD_REQUEST)
      }

    const order = new Orders();
    order.clients = await Clients.findOne({ where: { id: +createOrderDto.client_id } });
    order.users = await Users.findOne({ where: { id: +createOrderDto.user_id } });
    order.paymentMethods = payment_method;
    order.order_status = createOrderDto.order_status;
    order.order_date = new Date();
    order.initial_pay = createOrderDto.initial_pay;
    order.quantity = 1;

    const savedOrder = await this.ordersRepository.save(order);

    const apartment = await this.ordersRepository.manager
      .getRepository(Apartments)
      .findOne({
        where: { id: createOrderDto.apartment_id },
        relations: ['floor.entrance.buildings'],
      });

    // binodagi barcha apartmentlarga tegishli narxini olish
    //createOrderDto.price ? createOrderDto.price * apartment.room_space/
    const total = apartment.floor.entrance.buildings.mk_price * apartment.room_space;

    // umumiy qiymatni to'lov muddatiga bo'lgandagi bir oylik to'lov
    const oneMonthDue = createOrderDto.initial_pay ? 
    (total - createOrderDto.initial_pay) / createOrderDto.installment_month :
     total / createOrderDto.installment_month
      ;

    let schedule;

    if (payment_method.name_alias.toLowerCase() === 'rassrochka' || payment_method.name_alias.toLowerCase() === 'ipoteka') {

      const creditSchedule = [];
      const date = new Date();

      for (let i = 1; i <= createOrderDto.installment_month; i++) {
        const mon = new Date(date.setMonth(date.getMonth() + 1));

        const installment = new CreditTable();
        installment.orders = savedOrder;
        installment.due_amount = +oneMonthDue.toFixed(2);
        installment.due_date = mon;
        installment.left_amount = 0;
        installment.status = 'waiting';
        creditSchedule.push(installment);
      }

      schedule = await this.ordersRepository.manager
        .getRepository(CreditTable)
        .save(creditSchedule);
    }

    const updatedOrder = await this.ordersRepository.update({ id: savedOrder.id }, { total_amount: total },);

    const orderItem = new OrderItems();
    orderItem.orders = savedOrder;
    orderItem.apartments = await Apartments.findOne({ where: { id: +createOrderDto.apartment_id }, });
    orderItem.final_price = total;

    await Apartments.update(
      { id: createOrderDto.apartment_id },
      { status: 'sold' },
    );

    const saveOrderItem = await this.ordersRepository.manager
      .getRepository(OrderItems)
      .save(orderItem);


      if(createOrderDto.initial_pay){
          const caisher = await Caisher.findOne({ where: { is_active: true, is_default: true }, })
          const paymentPayload = {
          user_id: savedOrder.users.id,
          order_id: savedOrder.id,
          amount: savedOrder.initial_pay,
          caisher_id: caisher.id,
          caishertype: Caishertype.IN,
          pay_note: "boshlang'ich to'lov",
          paymentmethod: Paymentmethods.CASH,
          payment_date: new Date()
      }
    
    await this.paymentService.newPayment(paymentPayload)
  }
    return updatedOrder;
  }

  async getOrderList(id: number) {

    let order;
    if (id == 0) {
      order = await this.ordersRepository.find({
        relations: ['clients', 'users', 'payments', 'paymentMethods',
          'orderItems.apartments.floor.entrance.buildings.towns'],
      });
    } else {

      order = await this.ordersRepository.findOne({
        where: { id: id },
        relations: ['clients', 'payments', 'users', 'paymentMethods',
          'orderItems.apartments.floor.entrance.buildings.towns'],
      });
    }
    return order;
  }

  async getOrderListIsDue() {

    return await this.ordersRepository
      .manager
      .getRepository(Orders)
      .createQueryBuilder('orders')
      .where("orders.order_status =:logic", { logic: "active" })
      .getMany()
    // .innerJoinAndSelect("orders.metadata", "metadata")
  }

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.ordersRepository.update(
      { id: id },
      updateOrderDto,
    );
    return order;
  }

  async deleteOrder(arrayOfId: number[]) {
    const deleteOrder = await this.ordersRepository.delete(arrayOfId);
    return deleteOrder;
  }

}
