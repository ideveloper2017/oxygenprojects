import { ApiProperty } from "@nestjs/swagger";

export class FindFile {
    @ApiProperty({example: 'apartment_id'})
    entity: string;

    @ApiProperty({example: 1})
    record_id: number
}