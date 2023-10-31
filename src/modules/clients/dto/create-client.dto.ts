import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
enum Gender {
  Male = 'male',
  Female = 'female',
}
export class CreateClientDto {
  @ApiProperty({ example: 'Abdulloh', description: 'clients firstname ' })
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Abdurahmonov', description: 'clients lastname ' })
  @IsNotEmpty()
  @IsString()
  last_name: string;

  @ApiProperty({ example: 'Abdurahim ugli', description: 'clients middlename' })
  @IsString()
  middle_name: string;

  @ApiProperty({ example: '123456789', description: 'JShShIR' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{9}$/, { message: 'The tin must be a 9-digit numeric value' })
  tin: string;

  @IsEnum(Gender, {message: "Invalid gender entered"})
  @ApiProperty({ example: 'male', description: 'gender of client' })
  gender: string = 'male' || 'female';

  @ApiProperty({ example: 'jismoniy', description: 'type of client' })
  type: string = 'jismoniy' || 'yuridik';

  @ApiProperty({
    example: 'Namangan shahar islom karimov kochasi',
    description: 'clients address ',
  })
  @IsString()
  address: string;

  @ApiProperty({
    example: '+998 90 112 2442',
    description: 'clients contact number ',
  })
  @ApiProperty({ example: '+998 90 112 2442', description: 'mijoz tel raqami' })
  contact_number: string;

  @ApiProperty({ example: '1978-08-13' })
  date_of_birth: Date;
  
  
  @Matches(/^[A-Z]{2}\d{7}$/, { message: 'Invalid passport number' })
  @ApiProperty({ example: 'AD4586321' })
  passport_seria: string;

  @ApiProperty({ example: 'Namangan IIV' })
  given_from: string;

  @ApiProperty({ example: '1996-09-23' })
  given_date: Date;

  @ApiProperty({ example: '2006-08-13' })
  untill_date: Date;

  @ApiProperty({ example: 'Namangan viloyati Oxunboboyev' })
  legal_address: string;

  @ApiProperty({ example: "ro'yxatga olingan manzili" })
  registered_address: string;

  @ApiProperty({ example: 'izoh' })
  description: string;
}
