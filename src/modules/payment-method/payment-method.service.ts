import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethods } from './entities/payment-method.entity';
import { EditPaymentMethodDto } from './dto/update-paymeth.dto';
import { CreatePaymentMethodDto } from './dto/create-paymeth.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethods)
    private readonly paymentMethodRepo: Repository<PaymentMethods>,
  ) {}

  async addPaymentMethod(createPaymentMethodDto: CreatePaymentMethodDto) {
    let paymentMethod = new PaymentMethods();
    paymentMethod.name = createPaymentMethodDto.name;
    paymentMethod.name_alias = createPaymentMethodDto.name_alias
    paymentMethod.is_active = createPaymentMethodDto.is_active;

    paymentMethod = await this.paymentMethodRepo.save(paymentMethod);
    return {
      status: 201,
      data: paymentMethod,
      message: "To'lov turi qo'shildi",
    };
  }

  async addPaymentMethods(createPaymentMethodDto: CreatePaymentMethodDto[]) {
   let paymentMethods=[];
    for(let i of createPaymentMethodDto){
      paymentMethods.push({name:i.name,is_active:i.is_active})
    }


    paymentMethods.map((data)=>{
      if (!this.paymentMethodRepo.findOne({ where:{name:data.name} })) {
         this.paymentMethodRepo.save(paymentMethods);
      }
    })

  }

  async getPaymentMethod(id?: number) {
    let paymentMethod;
    if (id != 0) {
      paymentMethod = await this.paymentMethodRepo.findOne({
        where: { id: id },
      });
    } else {
      paymentMethod = await this.paymentMethodRepo.find();
    }
    return paymentMethod;
  }

  async updatePaymentMethod(
    id: number,
    editPaymentMethodDto: EditPaymentMethodDto,
  ) {
    const paymentMethod = await this.paymentMethodRepo.update(
      id,
      editPaymentMethodDto,
    );

    return paymentMethod;
  }

  async deletePaymentMethod(arrayOfId: number[]) {
    for (const id of arrayOfId) {
      await this.paymentMethodRepo.delete({ id: +id });
    }
    return { status: 200, message: "To'lov turi o'chirildi!" };
  }

  async createDefault() {
    const paymethods = await this.paymentMethodRepo.find();
    if (paymethods.length == 0) {
      this.paymentMethodRepo.save([
        {
          id:1,
          name: 'Нақд (so`m)',
          name_alias:'naqd',
          is_active: true,
        },
        {
          id:2,
          name: 'Naqd (dollar)',
          name_alias:'dollar',
          is_active: true,
        },
        {
          id:3,
          name: 'Ipoteka (Nasiya savdo)',
          name_alias:'ipoteka',
          is_active: true,
        },{
          id:4,
          name: 'Subsidia',
          name_alias:'subsidia',
          is_active: true,
        }
      ])
    }
  }
}
