import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ReCreateOrderDto {
  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  order_id: number;

  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  client_id: number;

  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  currency_value: number;

  @ApiProperty({
    example: 8_000_000,
    description: 'kvartira kvadrat metr narxi',
  })
  total_amount?: number;

  @ApiProperty({
    example: 8_000_000,
    description: 'kvartira kvadrat metr narxi',
  })
  price?: number;

  @ApiProperty({
    example: 8_000_000,
    description: 'kvartira kvadrat metr narxi',
  })
  paid_amount?: number;

  @ApiProperty({
    example: 8_000_000,
    description: 'kvartira kvadrat metr narxi',
  })
  paid_amount_usd?: number;


  @ApiProperty({ example: 25_000_000, description: 'boshlangich tolov somda' })
  initial_pay: number;

  @ApiProperty()
  initial_month: number;

  @ApiProperty({ example: '2023-09-04' })
  order_date: Date;

  @ApiProperty({ example: 12, description: "bo'lib tolash oyi = 12 ..." })
  installment_month?: number;
}
