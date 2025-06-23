import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ExchangeclientDto {
  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  client_id: number;

  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  new_client_id: number;

  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  order_id: number;

  @ApiProperty({ example: 1, description: 'sotib olinayotgan kvartira idsi' })
  @IsInt()
  new_order_id: number;
}
