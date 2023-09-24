import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Orders} from './entities/order.entity';
import {CreateOrderDto} from './dto/create-order.dto';
import {PaymentMethods} from '../payment-method/entities/payment-method.entity';
import {OrderItems} from '../order-items/entities/order-item.entity';
import {Apartments} from '../apartments/entities/apartment.entity';
import {CreditTable} from '../credit-table/entities/credit-table.entity';
import {UpdateOrderDto} from './dto/update-order.dto';
import {Clients} from '../clients/entities/client.entity';
import {Users} from '../users/entities/user.entity';
import {PaymentsService} from '../payments/payments.service';
import {Caisher} from '../caisher/entities/caisher.entity';
import {Caishertype} from 'src/common/enums/caishertype';
import {Paymentmethods} from 'src/common/enums/paymentmethod';
import {Payments} from '../payments/entities/payment.entity';
import {Booking} from '../booking/entities/booking.entity';
import {ApartmentStatus} from "../../common/enums/apartment-status";
import {OrderStatus} from "../../common/enums/order-status";
import {PaymentStatus} from 'src/common/enums/payment-status';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Orders)
        private readonly ordersRepository: Repository<Orders>,
        private readonly paymentService: PaymentsService
    ) {
    }

    async getLastID() {
        return await this.ordersRepository
            .createQueryBuilder('orders')
            .orderBy('id', 'DESC')
            .getOne();
    }

    async createOrder(createOrderDto: CreateOrderDto) {

        const payment_method = await PaymentMethods.findOne({where: {id: +createOrderDto.payment_method_id}});

        const checkApartment = await Apartments.findOne({where: {id: +createOrderDto.apartment_id}});
        if (checkApartment.status === ApartmentStatus.SOLD || checkApartment.status === ApartmentStatus.INACTIVE) {
            throw new HttpException('Xonadon allaqachon sotilgan', HttpStatus.BAD_REQUEST)
        }

        const order = new Orders();
        order.clients = await Clients.findOne({where: {id: +createOrderDto.client_id}});
        order.users = await Users.findOne({where: {id: +createOrderDto.user_id}});
        order.paymentMethods = payment_method;
        order.order_status = createOrderDto.order_status
        order.order_date = new Date();
        order.initial_pay = createOrderDto.initial_pay;
        order.quantity = 1;

        const savedOrder = await this.ordersRepository.save(order);

        const apartment = await Apartments.findOne({
            where: {id: createOrderDto.apartment_id},
            relations: ['floor.entrance.buildings'],
        });

        // binodagi barcha apartmentlarga tegishli narxini olish

        const total = createOrderDto.price ? createOrderDto.price * apartment.room_space : apartment.floor.entrance.buildings.mk_price * apartment.room_space;

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

            schedule = await CreditTable.save(creditSchedule);
        }

        const updatedOrder = await this.ordersRepository.update({id: savedOrder.id}, {total_amount: total},);

        const orderItem = new OrderItems();
        orderItem.orders = savedOrder;
        orderItem.apartments = await Apartments.findOne({where: {id: +createOrderDto.apartment_id},});
        orderItem.final_price = total;

        await Apartments.update(
            {id: createOrderDto.apartment_id},
            {status: ApartmentStatus.SOLD},
        );

        await Booking.createQueryBuilder()
            .update(Booking)
            .set({bron_is_active: false})
            .where('apartment_id = :apartment_id', {apartment_id: createOrderDto.apartment_id})
            .execute()


        await OrderItems.save(orderItem);


        const payment = new Payments();
        payment.orders = await Orders.findOne({where: {id: +savedOrder.id},});
        payment.users = savedOrder.users
        payment.amount = savedOrder.initial_pay;
        payment.payment_date = new Date();
        payment.paymentmethod = Paymentmethods.CARD;
        payment.caishers = await Caisher.findOne({where: {is_active: true, is_default: true},})
        payment.caisher_type = Caishertype.IN;
        payment.payment_status = PaymentStatus.PAID
        payment.pay_note = "Boshlangich to'lov";

        await Payments.save(payment);


        return updatedOrder;
    }

    async getOrderList(id: number) {

        let order;
        if (id == 0) {
            order = await this.ordersRepository.find({
                relations: ['clients', 'users', 'payments', 'paymentMethods',
                    'orderItems.apartments.floor.entrance.buildings.towns'],
            });
            order.forEach((orderItem) => {
                const sumOfPayments = orderItem.payments.reduce(
                    (accumulator, currentPayment) => accumulator + +currentPayment.amount,
                    0
                );
                orderItem.sumOfpayments = sumOfPayments ? sumOfPayments : 0;
            });


        } else {

            order = await this.ordersRepository.findOne({
                where: {id: id},
                relations: ['clients', 'payments', 'users', 'paymentMethods',
                    'orderItems.apartments.floor.entrance.buildings.towns'],
            });

            const sum = order['payments'].reduce((accumulator, currentValue) => accumulator + +currentValue.amount, 0)
            order['payments'] = sum


        }
        return order;
    }

    async getOrderListIsDue() {
        const result=[]
        const orders= await this.ordersRepository.createQueryBuilder('orders')
           .addSelect('orders.id')
           .addSelect('orders.order_date')
            .leftJoinAndSelect('orders.clients','clients','clients.id=orders.client_id')
            .leftJoinAndSelect('orders.payments','payments','payments.order_id=orders.id')
           .where("orders.order_status =:logic", { logic: "active" })
           .getMany()

        orders.forEach((data,key)=>{
         const sum=   data.payments.reduce((accumulator, currentValue) => {
                return accumulator + Number(currentValue.amount);
            }, 1)
                result.push([data,sum])
        })
        return result;
        // return await this.ordersRepository.
        // find({where: {order_status: OrderStatus.ACTIVE}, relations: ['clients']})
        //  .createQueryBuilder('orders')
        //  .leftJoinAndSelect('clients','client','client.id=orders.client_id')
        // .where("orders.order_status =:logic", { logic: "active" })
        // .getMany()

    }

    async updateOrder(id: number, updateOrderDto: UpdateOrderDto) {
        const order = await this.ordersRepository.update(
            {id: id},
            updateOrderDto,
        );
        return order;
    }

    async deleteOrder(arrayOfId: number[]) {
        const deleteOrder = await this.ordersRepository.delete(arrayOfId);
        return deleteOrder;
    }

    public async orderReject(id: number) {
        let order, orderItem;
        try {
            this.ordersRepository.update({id: id}, {order_status: OrderStatus.INACTIVE});
            order = await this.ordersRepository.findOne({where: {id: id}});
            orderItem = await OrderItems.findOne({where: {orders: order}});

            const apartment=this.ordersRepository.manager.getRepository(Apartments).findOne({where:{id:orderItem}})
            apartment.then((data)=>{
               this.ordersRepository.manager.getRepository(Apartments).update({id:data.id},{status:ApartmentStatus.FREE})
            })


            // const apartment=await this.ordersRepository.manager.getRepository(Apartments).findOne({where:{id:order.apartment_id}})
            // apartment.status=ApartmentStatus.FREE;
            // apartment.save()


            return
        } catch (error) {
                return {status:error.code,message:error.message}
        }
    }

}
