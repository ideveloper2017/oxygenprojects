import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthLoginDto } from './dto/AuthLoginDto';
import { Users } from '../users/entities/user.entity';
import { CommonErrors } from '../../common/errors/common-erros';
import { UsersService } from '../users/users.service';
import { Roles } from '../roles/entities/role.entity';
import { AccessTokenPayload, RefreshTokenPayload } from './type/jwtPayload';
import { sign, verify } from 'jsonwebtoken';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ExceptionTitleList } from '../../common/constants/exception-title-list.constants';
import { StatusCodesList } from '../../common/constants/status-codes-list.constants';
import { CustomHttpException } from '../../common/exception/exception-filter';


@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(authLoginDto: AuthLoginDto) {
    const user = await this.validateUser(authLoginDto);
    const payload = { roles: user.roles, userId: user.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  public async validateUser(authLoginDto: AuthLoginDto) {
    const { usernameoremail, password } = authLoginDto;
    const user = await this.findByEmail(authLoginDto.usernameoremail);
    if (!user?.validatePassword(password)) {
      throw new UnauthorizedException(CommonErrors.Unauthorized);
    }
    return user;
  }

  private async findByEmail(usernameoremail: string) {
    return await Users.findOne({
      where: {
        username: usernameoremail,
      },
      //relations:['roles','roles.permission']
    });
  }

  async getLoggedUser(user: any) {
    const loggedUser = await Users.findOne({
      where: {
        id: user,
        is_active: true,
      },
      relations: ['roles', 'roles.permission','userTowns'],
    });

    delete loggedUser.password;
    return loggedUser;
  }

  assignTokens(userId: number, roles: Roles, tokenVersion: number) {
    return {
      accessToken: this.createAccessToken({ userId, roles }),
      refreshToken: this.createRefreshToken({ userId, tokenVersion }),
    };
  }

  createAccessToken({ userId, roles }: AccessTokenPayload): string {
    return sign({ userId, roles }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '1d',
    });
  }

  createRefreshToken({ userId, tokenVersion }: RefreshTokenPayload): string {
    return sign({ userId, tokenVersion }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '1d',
    });
  }

  async refreshTokens(refreshToken: string) {
    // let decodedRefreshToken: RefreshTokenPayload;
    // let user: UserResponse;

    const decodedRefreshToken = verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const user = await this.userService.findOneById(decodedRefreshToken.userId);
    if (!user || user.tokenVersion !== decodedRefreshToken.tokenVersion) {
      throw new Error('Please register or sign in.');
    }

    const { id, roles, tokenVersion } = user;
    const tokens = await this.assignTokens(id, roles, tokenVersion);
    return {
      user,
      ...tokens,
    };
  }

  async changePassword(
    user: Users,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { oldPassword, password } = changePasswordDto;
    const checkOldPwdMatches = await user.validatePassword(oldPassword);
    if (!checkOldPwdMatches) {
      throw new CustomHttpException(
        ExceptionTitleList.IncorrectOldPassword,
        HttpStatus.PRECONDITION_FAILED,
        StatusCodesList.IncorrectOldPassword,
      );
    }
    user.password = password;
    await user.save();
  }
}
