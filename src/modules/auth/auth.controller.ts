import {Controller, Get, Post, Body, Patch, Param, Delete, UseGuards} from '@nestjs/common';
import { AuthService } from './auth.service';
import {ApiTags} from "@nestjs/swagger";
import {AuthLoginDto} from "./dto/AuthLoginDto";
import {AuthUser} from "../../common/decorators/auth-user.decorator";
import {AuthGuard} from "@nestjs/passport";

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login')
  signIn(@Body() signDto: AuthLoginDto) {
    return this.authService.signIn(signDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getLoggedUser(@AuthUser() user: any){
    return this.authService.getLoggedUser(user.userId);
  }

}
