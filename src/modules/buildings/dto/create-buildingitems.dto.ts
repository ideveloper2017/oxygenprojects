import { ApiProperty } from '@nestjs/swagger';
import { Column } from 'typeorm';

export class CreateBuildingitemsDto {
  @ApiProperty({
    example: 'Nest One buidings-1',
    description: 'bino nomi kiritiladi.',
  })
  building_id: number;

  // @ApiProperty()
  //   createBuildingDate: Date;

  @ApiProperty()
  note_action: string;

  @ApiProperty({
    example: 7500000,
    description: 'kvadrat metr narxi kiritiladi.',
  })
  mk_price: number;
}
