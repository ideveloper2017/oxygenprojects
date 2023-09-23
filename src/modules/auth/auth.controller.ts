import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
  Req, ValidationPipe, UsePipes, Res, HttpStatus, Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { AuthLoginDto } from './dto/AuthLoginDto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { CookieInterceptor } from './interceptor/cookie.interceptor';
import { LoginResponse } from './type/loginResponse';
import { Users } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import {CreateUserDto} from "../users/dto/create-user.dto";
import {ChangePasswordDto} from "./dto/change-password.dto";

@UseInterceptors(CookieInterceptor)
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  // @UseGuards(AuthGuard('local'))
  // @Post('/login')
  // signIn(@Body() signDto: AuthLoginDto) {
  //   return this.authService.signIn(signDto);
  // }

  @Post('login')
  async loginUser(@Body() loginUserDto: AuthLoginDto) {
    const { usernameoremail, password: loginPassword } = loginUserDto;
    let existingUser: Omit<Users, 'created_at' | 'updated_at'>;
    let isValid: boolean;

    try {
      existingUser =
        await this.userService.findUserWithPassword(usernameoremail);
      isValid = await bcrypt.compare(loginPassword, existingUser.password);
    } catch (error) {
      throw new ForbiddenException('Username or password is invalid');
    }

    if (!isValid) {
      throw new ForbiddenException('Username or password is invalid');
    }

    const { id, roles, tokenVersion } = existingUser;
    const { password, ...user } = existingUser;

    const tokens = this.authService.assignTokens(id, roles, tokenVersion);

    return tokens;
  }

  @Post('refresh-token')
  async getTokens(@Req() req): Promise<LoginResponse> {
    const token = req.cookies['refreshToken'];

    try {
      const { accessToken, refreshToken, user } =
        await this.authService.refreshTokens(token);
      if (accessToken && user) {
        return { accessToken, refreshToken };
      }
    } catch (error) {
      throw new ForbiddenException(error.message);
    }
  }




}
