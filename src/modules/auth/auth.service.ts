import {Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {UsersService} from "../users/users.service";
import {JwtService} from "@nestjs/jwt";
import {AuthLoginDto} from "./dto/AuthLoginDto";
import {Users} from "../users/entities/user.entity";
import {CommonErrors} from "../../common/errors/common-erros";


@Injectable()
export class AuthService {

    constructor(
          private jwtService: JwtService,
    ) {}




    async signIn(authLoginDto:AuthLoginDto) {
        const user=await this.validateUser(authLoginDto);
        const payload = { role: user.roles, userId: user.id };

        return {
            access_token: this.jwtService.sign(payload,{
                secret: process.env.JWT_SECRET,
                expiresIn: "60s",
            }),
        };
    }

    private async validateUser(authLoginDto:AuthLoginDto){
        const {usernameoremail,password}=authLoginDto;
        const user=await this.findByEmail(authLoginDto.usernameoremail);
        if (!(user?.validatePassword(password))){
            throw new UnauthorizedException(CommonErrors.Unauthorized)
        }
        return user;
    }


    private async findByEmail(usernameoremail:string){
        return await Users.findOne({
            where:{
                username:usernameoremail
            },
            //relations:['roles','roles.permission']
        })
    }

    async getLoggedUser(user: any) {
        const loggedUser =  await Users.findOne({
            where: {
                id: user,
            },
        });

        delete loggedUser.password;
        return loggedUser;
    }
}
