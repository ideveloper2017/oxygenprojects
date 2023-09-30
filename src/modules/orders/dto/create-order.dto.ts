import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status';

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  client_id: number;

  @ApiProperty({ example: 1, description: 'sotib olinayotgan kvartira idsi' })
  @IsInt()
  apartment_id: number;

  @ApiProperty({ example: 1, description: "to'lov turi tanlanadi" })
  @IsInt()
  payment_method_id: number;

  @ApiProperty({
    example: 8_000_000,
    description: 'kvartira kvadrat metr narxi',
  })
  @IsInt()
  price: number;

  @ApiProperty({ example: 25_000_000, description: 'kvartira umumiy narxi' })
  @IsInt()
  initial_pay: number;

  @ApiProperty({ example: 455_000_000, description: 'kvartira umumiy narxi' })
  total_amount: number;

  @ApiProperty({ example: 455_000_000, description: 'kvartira umumiy narxi $' })
  currency_value: number;

  @ApiProperty({ example: 455_000_000, description: 'kvartira umumiy narxi $' })
  total_amount_usd: number;

  @ApiProperty({ example: '2023-09-04' })
  order_date: Date;

  @ApiProperty({ example: 'active', enum: OrderStatus })
  order_status: OrderStatus;

  @ApiProperty({ example: 1, description: 'nechta kvartira olayotgani' })
  quantity: number;

  @ApiProperty({ example: 12, description: "bo'lib tolash oyi = 12 ..." })
  installment_month?: number;
}
