import { ApiProperty } from '@nestjs/swagger';
import {IsInt} from "class-validator";

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  client_id: number;

  @ApiProperty({
    example: 1,
    description: 'buyurtma rasmiylashtirgan xodim idisi',
  })
  @IsInt()
  user_id: number;

  @ApiProperty({ example: 1, description: 'sotib olinayotgan kvartira idsi' })
  @IsInt()
  apartment_id: number;

  @ApiProperty({ example: 1, description: "to'lov turi tanlanadi" })
  @IsInt()
  payment_method_id: number;
  
  @ApiProperty({ example: 8_000_000, description: 'kvartira kvadrat metr narxi' })
  @IsInt()
  price: number;

  @ApiProperty({ example: 25_000_000, description: 'kvartira umumiy narxi' })
  @IsInt()
  initial_pay: number;
  

  @ApiProperty({ example: 455_000_000, description: 'kvartira umumiy narxi' })
  total_amount: number;

  @ApiProperty({ example: '2023-09-04' })
  order_date: Date;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  order_status: string;

  @ApiProperty({ example: 2, description: 'nechta kvartira olayotgani' })
  quantity: number;

  @ApiProperty({
    example: false,
    description: 'buyurtma qabul qilingan yoki yoqligi',
  })
  is_accepted: boolean;

  @ApiProperty({ example: 12, description: "bo'lib tolash oyi = 12 ..." })
  installment_month?: number;
}
