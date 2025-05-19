import { ApiProperty } from '@nestjs/swagger';

export class TransferOrderDto {

  @ApiProperty()
  client_id: number;
  @ApiProperty()
  to_client_id: number;
}
