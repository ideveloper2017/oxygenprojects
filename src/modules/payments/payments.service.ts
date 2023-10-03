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
import { Caishertype } from 'src/common/enums/caishertype';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payments)
    private readonly paymentRepo: Repository<Payments>,
  ) {}

  // ========================== To'lov qabul qilish ==========================================

  async newPayment(newPaymentDto: NewPaymentDto) {

    try {
      const { paymentMethods } = await Orders.findOne({
        where: { id: newPaymentDto.order_id },
        relations: ['paymentMethods'],
      });
      
      const usdRate = await ExchangRates.findOne({where: {is_default: true}})
      let newPay;
  
      if (
        paymentMethods.name_alias.toLowerCase() == 'ipoteka' ||
        paymentMethods.name_alias.toLowerCase() == 'subsidia'
      ) {
        newPay = await this.payForInstallment(newPaymentDto)
      }
        
      else {
        newPay = await this.doPayment(newPaymentDto)
      }
  
      
      if(newPaymentDto.is_completed && newPaymentDto.caishertype === Caishertype.IN){
        await Orders.update({id: newPaymentDto.order_id}, {order_status: OrderStatus.COMPLETED})
      }else if(newPaymentDto.is_completed && newPaymentDto.caishertype === Caishertype.OUT){
        await Orders.update({id: newPaymentDto.order_id}, {order_status: OrderStatus.REFUNDED})
      }
  
      return newPay;
    } catch (error) {
      return null
    }
  }

  // ========================== Barcha to'lovlar royxatini olish ==============================

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

  // ========================== To'lovni tahrirlash ===========================================

  async update(id: number, newPaymentDto: UpdatePaymentDto) {
    return await this.paymentRepo.update({ id: id }, newPaymentDto);
  }

  // ========================== To'lovni ochirish =============================================
  
  async deletePayment(arrayOfId: number[]) {
    let counter = 0;
    for (const i of arrayOfId) {
      counter += (await this.paymentRepo.update({ id: i },{ is_deleted: true })).affected
    }

    return counter;
  }


  // ========================== o'chirilgan To'lovni qayta tiklash ============================
  
  async recoverPayment (arrayOfId: number[]) {
    let counter = 0 
    for(let i of arrayOfId) {
      counter += (await this.paymentRepo.update({id: i}, {is_deleted: false})).affected
      }
      return counter     
  }

  // ========================== Bo'lib to'lash uchun to'lov qabul qilish ======================

  // quyidagi method  "async newPayment" metodi ichida ishlaydi yani o'sha yerda chaqirilgan 
  // maqsad kod o'qilishini osonlashtirish, va tartibli bo'lishi uchun 

  public async payForInstallment(installmentDto: NewPaymentDto){
    let money = installmentDto.amount;
    while (money > 0) {
      
      const nextPaid = await CreditTable.findOne({
        where: { order_id: installmentDto.order_id, status: 'waiting' },
        order: { due_date: 'ASC' },
      });

      if (!nextPaid) {
        break;
      }
      // const amount_usd = nextPaid.due_amount / usdRate.rate_value

      if (money >= nextPaid.due_amount) {
        if (!nextPaid.left_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            { status: 'paid', left_amount: 0,
              currency_value: installmentDto.currency_value,
              usd_due_amount: Math.floor(nextPaid.due_amount / installmentDto.currency_value)
            },
          );
          money -= nextPaid.due_amount;
        } else {
          await CreditTable.update(
            { id: nextPaid.id },
            { status: 'paid', left_amount: 0,
              currency_value: installmentDto.currency_value,
              usd_due_amount: Math.floor(nextPaid.due_amount / installmentDto.currency_value)
           },
          );
          money -= nextPaid.left_amount;
        }
      } else {
        if (!nextPaid.left_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            { left_amount: Math.floor(nextPaid.due_amount - money),
              currency_value: installmentDto.currency_value,
              usd_due_amount: Math.floor((nextPaid.due_amount - money)/ installmentDto.currency_value)
            },
            );
            break;
      } else {
        if (money >= nextPaid.left_amount) {
          await CreditTable.update(
            { id: nextPaid.id },
            { status: 'paid', left_amount: 0,
              currency_value: installmentDto.currency_value,
              usd_due_amount: Math.floor(nextPaid.due_amount / installmentDto.currency_value)
            },
            );
            money -= nextPaid.left_amount;
      } else {
        await CreditTable.update(
          { id: nextPaid.id },
          { left_amount: Math.floor(nextPaid.left_amount - money), 
            currency_value: installmentDto.currency_value , 
            usd_due_amount: Math.floor((nextPaid.left_amount - money)/ installmentDto.currency_value)
          },
        );
            break;
          }
        }
      }
    }
    return await this.doPayment(installmentDto)
    

    // const payment = new Payments();
    // payment.orders = await Orders.findOne({where: { id: +installmentDto.order_id } });
    // payment.users = await Users.findOne({where: { id: +installmentDto.user_id },});
    // payment.amount = installmentDto.amount ? installmentDto.amount : (installmentDto.amount_usd * installmentDto.currency_value);
    // payment.amount_usd = installmentDto.amount_usd ? installmentDto.amount_usd : +(installmentDto.amount/installmentDto.currency_value).toFixed(2);
    // payment.currency_value = installmentDto.currency_value;
    // payment.payment_date = new Date();
    // payment.paymentmethods = installmentDto.paymentmethods;
    // payment.caishers = await Caisher.findOne({where: { id: installmentDto.caisher_id },});
    // payment.caisher_type = installmentDto.caishertype;
    // payment.pay_note = installmentDto.pay_note;
    // payment.payment_status = PaymentStatus.PAID;
    

  }

  async doPayment(payDto: NewPaymentDto){
    const payment = new Payments();
    payment.orders = await Orders.findOne({where: { id: +payDto.order_id } });
    payment.users = await Users.findOne({where: { id: +payDto.user_id },});
    payment.amount = payDto.amount ? payDto.amount : (payDto.amount_usd * payDto.currency_value);
    payment.amount_usd = payDto.amount_usd ? payDto.amount_usd : Math.floor(payDto.amount/payDto.currency_value);
    payment.currency_value = payDto.currency_value;
    payment.payment_date = new Date();
    payment.paymentmethods = payDto.paymentmethods;
    payment.caishers = await Caisher.findOne({where: { id: payDto.caisher_id },});
    payment.caisher_type = payDto.caishertype;
    payment.pay_note = payDto.pay_note;
    payment.payment_status = PaymentStatus.PAID;
    
    return await this.paymentRepo.save(payment);

  }
}