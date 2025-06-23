import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ReCreateOrderFreeAppDto {
  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  client_id: number;

  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  order_id: number;

  @ApiProperty({ example: 1, description: 'sotib olinayotgan kvartira idsi' })
  @IsInt()
  apparment_id: number;

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
}
