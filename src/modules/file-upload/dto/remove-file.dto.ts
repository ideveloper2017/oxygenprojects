import { ApiProperty } from "@nestjs/swagger";

export class RemoveFileDto {
    @ApiProperty({example: "Apartments" })
    entity_name: string;

    @ApiProperty({example: 2 })
    id: number
}