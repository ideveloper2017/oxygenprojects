import { Injectable } from '@nestjs/common';
import { NewPaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Repository } from 'typeorm';
import { Payments } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Orders } from '../orders/entities/order.entity';
import { CreditTable } from '../credit-table/entities/credit-table.entity';

@Injectable()
export class PaymentsService {
  constructor (@InjectRepository(Payments) private readonly paymentRepo: Repository<Payments>){}

  async newPayment(newPaymentDto: NewPaymentDto){

    const {paymentMethods}= await Orders.findOne({where: {id: newPaymentDto.order_id}, relations: ['paymentMethods']})
    let newPay
    if(paymentMethods.name.toLowerCase() == 'rassrochka') {

      let check = 1
      let money = newPaymentDto.amount

      while(check) {
        console.log('inside of if:');

          let lastPaid = await CreditTable.findOne({where: {status: 'waiting'}, order: {'due_date':'ASC' }})
          // console.log(lastPaid.due_amount-lastPaid.left_amount);
          const leftAmount = money - (lastPaid.due_amount - lastPaid.left_amount)
          
          // break
          if(leftAmount > 0 ){
            console.log(leftAmount);
            
            if(leftAmount >= lastPaid.due_amount){
             
              await CreditTable.update({id: lastPaid.id}, {status: 'paid', left_amount: 0})
              money -= lastPaid.due_amount
              check = 1
            
            }else {

              await CreditTable.update({id: lastPaid.id}, {left_amount: lastPaid.due_amount - leftAmount })
              money-= leftAmount
              check =1
              
            }
          }else {
            await CreditTable.update({id: lastPaid.id}, {left_amount:lastPaid.due_amount - leftAmount})
            // money-= lastPaid.left_amount
            break
          }
        }
        // console.log(leftAmount);
        const payment = new Payments()
    payment.order_id = newPaymentDto.order_id
    payment.amount = newPaymentDto.amount
    payment.payment_date = new Date()
    payment.by_card= newPaymentDto.by_card
    payment.in_cash = newPaymentDto.in_cash
    payment.bank = newPaymentDto.bank
    
    newPay = await this.paymentRepo.save(payment)

  }else {
    
    
        const payment = new Payments()
    payment.order_id = newPaymentDto.order_id
    payment.amount = newPaymentDto.amount
    payment.payment_date = new Date()
    payment.by_card= newPaymentDto.by_card
    payment.in_cash = newPaymentDto.in_cash
    payment.bank = newPaymentDto.bank
    
    newPay = await this.paymentRepo.save(payment)
    
  }
    return newPay
  }
  
}
