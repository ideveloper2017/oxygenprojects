import { ApiProperty } from "@nestjs/swagger";

export class RefundDto {
    @ApiProperty({example: true})
    is_refunding: boolean
}