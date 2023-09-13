import {IsEmail, IsNotEmpty} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";


export class AuthLoginDto{

    @ApiProperty()
    @IsNotEmpty()
    usernameoremail:string;

    @ApiProperty()
    @IsNotEmpty()
    password:string;
}