import { Injectable } from '@nestjs/common';
import { NewPaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Repository } from 'typeorm';
import { Payments } from './entities/payment.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PaymentsService {
  constructor (@InjectRepository(Payments) private readonly paymentRepo: Repository<Payments>){}

  async newPayment(newPaymentDto: NewPaymentDto){
    const payment = new Payments()
    payment.order_id = newPaymentDto.order_id
    payment.amount = newPaymentDto.amount
    payment.by_card= newPaymentDto.by_card
    payment.in_cash = newPaymentDto.in_cash
    payment.bank = newPaymentDto.bank

    const newPay = await this.paymentRepo.save(payment)
    
    return newPay
  }
  
}
