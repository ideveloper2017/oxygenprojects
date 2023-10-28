import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApartmentStatus } from 'src/common/enums/apartment-status';
import {PositionStatus} from "../../../common/enums/PositionStatus";

export class CreateApartmentDto {
  @ApiProperty({ example: 4 })
  room_number: number;

  @ApiProperty({ example: 3 })
  cells: number;

  @ApiProperty({ example: 78.5 })
  room_space: number;

  @IsString()
  // @IsEnum({enum: ['free', 'sold', 'bron', 'inactive'] , description: "Xato qiymat kiritildi"})
  @ApiProperty({ example: 'free', enum: ['free', 'sold', 'bron', 'inactive'] })
  status: ApartmentStatus

  @ApiProperty({example:"leftside",enum:PositionStatus})
  positions:PositionStatus;
}
