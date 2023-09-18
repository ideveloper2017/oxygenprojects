import { ApiProperty } from '@nestjs/swagger';

export class CreateCaisherDto {
  @ApiProperty()
  caisher_name: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  is_default: boolean;
}
