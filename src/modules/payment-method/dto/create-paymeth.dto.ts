import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentMethodDto {
    @ApiProperty({example: "Naqd", description: "dollar"})
    name: string;
    
    
    @ApiProperty({example: "Накд", description: "dollar"})
    name_alias:string;
    
    @ApiProperty({example: false, description: 'active yoki active emasligi'})
    is_active: boolean;

   
}