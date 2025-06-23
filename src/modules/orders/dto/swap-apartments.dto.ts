import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class SwapApartmentsDto {
  @ApiProperty({ description: 'First client\'s order ID' })
  @IsNumber()
  firstOrderId: number;

  @ApiProperty({ description: 'Second client\'s order ID' })
  @IsNumber()
  secondOrderId: number;

  @ApiProperty({ description: 'First client\'s new apartment ID' })
  @IsNumber()
  firstClientNewApartmentId: number;

  @ApiProperty({ description: 'Second client\'s new apartment ID' })
  @IsNumber()
  secondClientNewApartmentId: number;

  @ApiProperty({ description: 'Whether to recalculate payments based on new square meter prices', required: false })
  @IsBoolean()
  @IsOptional()
  recalculatePayments: boolean = true;
}
