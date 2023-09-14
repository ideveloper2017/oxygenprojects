import { ApiProperty } from "@nestjs/swagger";

export class CreateFileUploadDto {
   @ApiProperty({example: 'Towns', description: "Nimaning rasmi yulanayotganligi kvartira, bino, obyekt ..."})
   entity: string;
   
   @ApiProperty({example: 4, description: "Rasmi yuklanayotgan bino, obyekt, kvartira ID si"})
    record_id: number
}
