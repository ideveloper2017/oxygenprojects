import { ApiProperty } from '@nestjs/swagger';
import {isDecimal, IsInt} from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status';
import {PositionStatus} from "../../../common/enums/PositionStatus";

export class CreateOrderDto {
  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  client_id: number;

  @ApiProperty({ example: 1, description: 'sotib olinayotgan kvartira idsi' })
  @IsInt()
  apartment_id: number;
  
  @ApiProperty({ example: 1, description: 'sotib olinayotgan kvartira idsi' })
  @IsInt()
  caisher_id: number;

  @ApiProperty({ example: 1, description: "to'lov turi tanlanadi" })
  @IsInt()
  payment_method_id: number;

  @ApiProperty({
    example: 8_000_000,
    description: 'kvartira kvadrat metr narxi',
  })
  price?: number;

  @ApiProperty({ example: 25_000_000, description: 'boshlangich tolov somda' })
  initial_pay: number;

  @ApiProperty({ example: '2023-09-04' })
  order_date: Date;

  @ApiProperty({ example: 'active', enum: OrderStatus })
  order_status: OrderStatus;

  @ApiProperty({example:'100%',description:'Foiz hisobida'})
  percent:number;

  @ApiProperty({example:'18 oy',description:'Topshirish muddati'})
  delivery_time:number;

  @ApiProperty({ example: 1, description: 'nechta kvartira olayotgani' })
  quantity: number;

  @ApiProperty({ example: 12, description: "bo'lib tolash oyi = 12 ..." })
  installment_month?: number;
}
