import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import {AuthService} from "./auth.service";


@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super();
    }

    // async validate(usernameoremail: string, password: string): Promise<any> {
    //     const user = await this.authService.validateUserCredentials(
    //         usernameoremail,
    //         password,
    //     );
    //     if (!user) {
    //         throw new UnauthorizedException();
    //     }
    //     return user;
    // }
}