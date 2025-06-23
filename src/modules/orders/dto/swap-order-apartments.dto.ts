import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class SwapOrderApartmentsDto {
  @ApiProperty({ description: 'First order ID' })
  @IsNumber()
  firstOrderId: number;

  @ApiProperty({ description: 'Second order ID' })
  @IsNumber()
  secondOrderId: number;

  @ApiProperty({ description: 'Whether to recalculate payments based on new apartment prices', required: false, default: true })
  recalculatePayments: boolean = true;
}
