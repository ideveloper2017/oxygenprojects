import { Injectable } from '@nestjs/common';
import { NewPaymentDto } from './dto/create-payment.dto';
import { In, Repository } from 'typeorm';
import { Payments } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Caisher } from '../caisher/entities/caisher.entity';
import { Users } from '../users/entities/user.entity';
import { PaymentStatus } from '../../common/enums/payment-status';
import { OrderStatus } from 'src/common/enums/order-status';
import { ExchangRates } from '../exchang-rates/entities/exchang-rate.entity';

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

    const usdRate = await ExchangRates.findOne({where: {is_default: true}})
    let newPay;

    if (
      paymentMethods.name_alias.toLowerCase() == 'rassrochka' ||
      paymentMethods.name_alias.toLowerCase() == 'ipoteka' ||
      paymentMethods.name_alias.toLowerCase() == 'subsidia'
    ) {
      let money = newPaymentDto.amount;
      while (money > 0) {
        const nextPaid = await CreditTable.findOne({
          where: { order_id: newPaymentDto.order_id, status: 'waiting' },
          order: { due_date: 'ASC' },
        });

        if (!nextPaid) {
          break;
        }
        const amount_usd = nextPaid.due_amount / usdRate.rate_value

        if (money >= nextPaid.due_amount) {
          if (!nextPaid.left_amount) {
            await CreditTable.update(
              { id: nextPaid.id },
              { status: 'paid', left_amount: 0 },
            );
            money -= nextPaid.due_amount;
          } else {
            await CreditTable.update(
              { id: nextPaid.id },
              { status: 'paid', left_amount: 0 },
            );
            money -= nextPaid.left_amount;
          }
        } else {
          if (!nextPaid.left_amount) {
            await CreditTable.update(
              { id: nextPaid.id },
              { left_amount: +(nextPaid.due_amount - money).toFixed(2) },
            );
            break;
          } else {
            if (money >= nextPaid.left_amount) {
              await CreditTable.update(
                { id: nextPaid.id },
                { status: 'paid', left_amount: 0 },
              );
              money -= nextPaid.left_amount;
            } else {
              await CreditTable.update(
                { id: nextPaid.id },
                { left_amount: +(nextPaid.left_amount - money).toFixed(2) },
              );
              break;
            }
          }
        }
      }

      const payment = new Payments();
      payment.orders = await Orders.findOne({
        where: { id: +newPaymentDto.order_id },
      });
      payment.users = await Users.findOne({
        where: { id: +newPaymentDto.user_id },
      });
      payment.amount = newPaymentDto.amount ? newPaymentDto.amount : (newPaymentDto.amount_usd * newPaymentDto.currency_value);
      payment.amount_usd = newPaymentDto.amount_usd ? newPaymentDto.amount_usd : +(newPaymentDto.amount/newPaymentDto.currency_value).toFixed(2);
      payment.currency_value = newPaymentDto.currency_value;
      payment.payment_date = new Date();
      payment.paymentmethods = newPaymentDto.paymentmethods;
      payment.caishers = await Caisher.findOne({
        where: { id: newPaymentDto.caisher_id },
      });
      payment.caisher_type = newPaymentDto.caishertype;
      payment.pay_note = newPaymentDto.pay_note;
      payment.payment_status = PaymentStatus.PAID;
      newPay = await this.paymentRepo.save(payment);

    } else {
      
      const payment = new Payments();
      payment.orders = await Orders.findOne({
        where: { id: newPaymentDto.order_id },
      });
      payment.users = await Users.findOne({
        where: { id: +newPaymentDto.user_id },
      });
      payment.amount = newPaymentDto.amount;
      payment.amount_usd = newPaymentDto.amount_usd;
      payment.currency_value = newPaymentDto.currency_value;
      payment.payment_date = new Date();
      payment.paymentmethods = newPaymentDto.paymentmethods;
      payment.caishers = await Caisher.findOne({
        where: { id: newPaymentDto.caisher_id },
      });
      newPay = await this.paymentRepo.save(payment);
      payment.caisher_type = newPaymentDto.caishertype;
      payment.pay_note = newPaymentDto.pay_note;
      payment.payment_status = PaymentStatus.PAID;

      newPay = await this.paymentRepo.save(payment);
    }
    
    if(newPaymentDto.is_completed){
      await Orders.update({id: newPaymentDto.order_id}, {order_status: OrderStatus.COMPLETED})
    }
    return newPay;
  }

  async getAllPayments(offset: number, limit: number, users:any) {
    const user=await Users.findOne({where:{id:users.userId},relations:['roles']})
    const temp_array=user.town_access?.split(',');
    const town_access:number[]=temp_array?.map((str)=>Number(str))
    let orders_res;

    if (user.roles.role_name=='SuperAdmin') {
      orders_res = await this.paymentRepo.createQueryBuilder('payments')
          .leftJoinAndSelect('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
          .leftJoinAndSelect('payments.orders', 'orders', 'orders.id=payments.order_id')
          .leftJoinAndSelect('orders.clients', 'clients', 'clients.id=orders.client_id')
          .leftJoinAndSelect('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
          .leftJoinAndSelect('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
          .leftJoinAndSelect('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
          .leftJoinAndSelect('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
          .leftJoinAndSelect('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
          .leftJoinAndSelect('buildings.towns', 'towns', 'towns.id=buildings.town_id')
          .skip(offset)
          .take(limit)
          .orderBy('payments.id', "DESC")
          .getMany();
    } else if (user.roles.role_name=='manager'){
      orders_res = await this.paymentRepo.createQueryBuilder('payments')
          .leftJoinAndSelect('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
          .leftJoinAndSelect('payments.orders', 'orders', 'orders.id=payments.order_id')
          .leftJoinAndSelect('orders.clients', 'clients', 'clients.id=orders.client_id')
          .leftJoinAndSelect('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
          .leftJoinAndSelect('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
          .leftJoinAndSelect('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
          .leftJoinAndSelect('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
          .leftJoinAndSelect('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
          .leftJoinAndSelect('buildings.towns', 'towns', 'towns.id=buildings.town_id')
          .where('towns.id In(:...town_access)', {town_access})
          .skip(offset)
          .take(limit)
          .orderBy('payments.id', "DESC")
          .getMany();
    } else if (user.roles.role_name=='Seller'){
      orders_res = await this.paymentRepo.createQueryBuilder('payments')
          .leftJoinAndSelect('payments.caishers', 'caishers', 'caishers.id=payments.caisher_id')
          .leftJoinAndSelect('payments.orders', 'orders', 'orders.id=payments.order_id')
          .leftJoinAndSelect('orders.clients', 'clients', 'clients.id=orders.client_id')
          .leftJoinAndSelect('orders.orderItems', 'orderitems', 'orderitems.order_id=orders.id')
          .leftJoinAndSelect('orderitems.apartments', 'apartments', 'apartments.id=orderitems.apartment_id')
          .leftJoinAndSelect('apartments.floor', 'floor', 'floor.id=apartments.floor_id')
          .leftJoinAndSelect('floor.entrance', 'entrance', 'entrance.id=floor.entrance_id')
          .leftJoinAndSelect('entrance.buildings', 'buildings', 'buildings.id=entrance.building_id')
          .leftJoinAndSelect('buildings.towns', 'towns', 'towns.id=buildings.town_id')
          .where('towns.id In(:...town_access)', {town_access})
          .skip(offset)
          .take(limit)
          .orderBy('payments.id', "DESC")
          .getMany();
    }



    return orders_res;
  }

  async update(id: number, newPaymentDto: UpdatePaymentDto) {
    return await this.paymentRepo.update({ id: id }, newPaymentDto);
  }

  async deletePayment(arrayOfId: number[]) {
    let counter = 0;
    for (const i of arrayOfId) {
      counter += (await this.paymentRepo.update({ id: i },{ is_deleted: true })).affected
    }

    return counter;
  }

  async recoverPayment (arrayOfId: number[]) {
    let counter = 0 
    for(let i of arrayOfId) {
      counter += (await this.paymentRepo.update({id: i}, {is_deleted: false})).affected
      }
      return counter     
  }


  public async checkOrderIsCompleted(order_id: number){
      
  }
}