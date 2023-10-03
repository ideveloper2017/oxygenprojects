import { ApiProperty } from '@nestjs/swagger';
import { Paymentmethods } from '../../../common/enums/paymentmethod';
import { Caishertype } from '../../../common/enums/caishertype';
import { PaymentStatus } from '../../../common/enums/payment-status';

export class NewPaymentDto {
  @ApiProperty({example: 1})
  user_id: number;

  @ApiProperty({ example: 1 })
  order_id: number;

  @ApiProperty({ example: '2023-12-06' })
  payment_date: Date;

  @ApiProperty({ example: 15_000_000 })
  amount: number;

  @ApiProperty({ example: 12000 })
  currency_value: number;

 
  @ApiProperty({example: "cash"})
  paymentmethods: Paymentmethods;

  @ApiProperty({example: 1})
  caisher_id: number;

  @ApiProperty({example: "in"})
  caishertype: Caishertype;

  @ApiProperty({example: "paid"})
  payment_status: PaymentStatus;

  @ApiProperty({example: "to'lov"})
  pay_note: string;

  @ApiProperty({example: false})
  is_completed: boolean


}
