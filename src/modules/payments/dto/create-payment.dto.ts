import { ApiProperty } from '@nestjs/swagger';
import { Paymentmethods } from '../../../common/enums/paymentmethod';
import { Caishertype } from '../../../common/enums/caishertype';
import { PaymentStatus } from '../../../common/enums/payment-status';

export class NewPaymentDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty({ example: 1 })
  order_id: number;

  @ApiProperty({ example: '2023-12-06' })
  payment_date: Date;

  @ApiProperty({ example: 5_000_000 })
  amount: number;

  @ApiProperty()
  paymentmethods: Paymentmethods;

  @ApiProperty()
  caisher_id: number;

  @ApiProperty()
  caishertype: Caishertype;

  @ApiProperty()
  payment_status: PaymentStatus;

  @ApiProperty()
  pay_note: string;
}
