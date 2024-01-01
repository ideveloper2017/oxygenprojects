import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateApartmentPriceDto {
  @ApiProperty()
  apartment_id: number[];

  @ApiProperty()
  mk_price: number;
}
