import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Column } from 'typeorm';
export class CreateUserDto {
  constructor(partial: Partial<CreateUserDto>) {
    Object.assign(this, partial);
  }

  @ApiProperty({ example: 'Mansurxon' })
  first_name: string;

  @ApiProperty({ example: 'Samadov' })
  last_name: string;

  @ApiProperty({ example: 'mansoor07' })
  username: string;

  @ApiProperty({ example: '+998 94 995 1254' })
  phone_number: string;

  @ApiProperty({ example: '1234' })
  password: string;

  @ApiProperty({ example: false })
  is_active: boolean;

  @ApiProperty({ example: 3 })
  role_id: number;

  @ApiProperty()
  town_access: string[];
}
