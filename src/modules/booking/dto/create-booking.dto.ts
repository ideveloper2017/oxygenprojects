import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class BookingDto {
  
  @ApiProperty({ example: 1, description: "ro'yxatdan o'tgan mijoz idisi" })
  @IsInt()
  client_id: number;

  @ApiProperty({
    example: 1,
    description: 'buyurtma rasmiylashtirgan xodim idisi',
  })
  @IsInt()
  user_id: number;

  @ApiProperty({ example: 1, description: 'sotib olinayotgan kvartira idsi' })
  @IsInt()
  apartment_id: number;

  @ApiProperty({ example: '2023-09-04' })
  bron_date: Date;
  
  @ApiProperty({example: 5_000_000 })
  bron_amount: number
  
  
  @ApiProperty({ example: '2023-09-25' })
  bron_expires: Date

}