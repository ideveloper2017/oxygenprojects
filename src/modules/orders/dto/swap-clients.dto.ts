import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class SwapClientsDto {
  @ApiProperty({ description: 'First order ID' })
  @IsNumber()
  firstOrderId: number;

  @ApiProperty({ description: 'Second order ID' })
  @IsNumber()
  secondOrderId: number;
}
