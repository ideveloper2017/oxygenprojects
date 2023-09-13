import { ApiProperty } from "@nestjs/swagger"

export class NewPaymentDto {
    @ApiProperty({example:1})
    order_id: number
    
    @ApiProperty({example:'2023-12-06'})
    payment_date: Date

    @ApiProperty({example: 5_000_000})
    amount: number
    
    @ApiProperty({example: true})
    in_cash: boolean
    
    @ApiProperty({example: false})
    by_card: boolean
    
    @ApiProperty({example:false})
    bank: boolean
}