import { ApiProperty } from '@nestjs/swagger';

export class CreatexchangeRateDto {
  @ApiProperty({ example: 1220 })
  rate_value: number;

  @ApiProperty({ example: 1 })
  currency_id: number;

  @ApiProperty({ example: true })
  is_default: boolean;
}
