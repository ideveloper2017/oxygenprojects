import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/role.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoginResponse } from '../auth/type/loginResponse';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcryptjs';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../auth/decorator/roles.decorator';
import { Users } from './entities/user.entity';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  //@Roles('admin', 'manager')
  // @ApiBearerAuth()
  @ApiOkResponse({ type: CreateUserDto, isArray: true }) // @ApiBearerAuth()
  @Get('/list/:id')
  findAll(@Param('id') id: number) {
    return this.usersService.getUsers(id).then((data) => {
      if (data || data.length > 0) {
        return { success: true, data, message: 'Fetched data' };
      } else {
        return { success: false, message: 'data not found ' };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  //@Roles('admin', 'manager')
  @ApiBearerAuth()
  @Post('/save')
  public async createLogin(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createLogin(createUserDto);
  }


  @Patch('/update/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {

    return this.usersService
      .updateUser(id, updateUserDto)
      .then((data) => {
        if (data) {
          return { success: true, message: 'Updated is record!!!' };
        } else {
          return { success: false, message: 'not updated is record!!!' };
        }
      })
      .catch((error) => {
        return { status: 401, message: error.message };
      });
  }

  @Post('/delete')
  deleteUsers(@Body() userid: number[]) {
    return this.usersService
      .deleteUsers(userid)
      .then((data) => {
        return data
          ? { success: true, message: 'user Deleted ' }
          : { success: false, message: 'not deleted!!!' };
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }

  @UseGuards(AuthGuard('jwt'))
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @Get('profile')
  getLoggedUser(@AuthUser() user: any) {
    return this.authService
      .getLoggedUser(user.userId)
      .catch((error) => console.log(error));
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Put('/change-password')
  changePassword(
    @AuthUser()
    user: Users,
    @Body()
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(user, changePasswordDto);
  }

  @Get('/roles')
  public async getRole() {
    return this.usersService.getRoles();
  }

  @Get('/permissions')
  public async getPermission() {
    return this.usersService.getPermission();
  }

  @Post('/recover')
  recoverUsers(@Body() userid: number[]) {
    return this.usersService
      .recoverUsers(userid)
      .then((data) => {
        return data
          ? { success: true, message: 'user Restored' }
          : { success: false, message: 'not restored!!!' };
      })
      .catch((error) => {
        return { success: false, message: error.message };
      });
  }
}
