import {IsEmail, IsNotEmpty, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";


export class AuthLoginDto{

    constructor(partial:Partial<AuthLoginDto>) {
        Object.assign(this,partial)
    }

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    usernameoremail:string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    password:string;
}