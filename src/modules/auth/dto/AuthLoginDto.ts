import {IsEmail, IsNotEmpty} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";


export class AuthLoginDto{

    constructor(partial:Partial<AuthLoginDto>) {
        Object.assign(this,partial)
    }

    @ApiProperty()
    @IsNotEmpty()
    usernameoremail:string;

    @ApiProperty()
    @IsNotEmpty()
    password:string;
}