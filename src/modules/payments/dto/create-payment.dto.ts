import { ApiProperty } from '@nestjs/swagger';
import { Paymentmethods } from '../../../common/enums/paymentmethod';

export class NewPaymentDto {
  @ApiProperty({ example: 1 })
  order_id: number;

  @ApiProperty({ example: '2023-12-06' })
  payment_date: Date;

  @ApiProperty({ example: 5_000_000 })
  amount: number;

  @ApiProperty()
  paymentmethod: Paymentmethods;
}
