import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  ParseIntPipe,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {ApiBearerAuth, ApiOkResponse, ApiTags} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/role.guard';
import {JwtAuthGuard} from "../auth/jwt-auth.guard";
import {LoginResponse} from "../auth/type/loginResponse";
import {AuthService} from "../auth/auth.service";
import * as bcrypt from 'bcryptjs';
import {AuthUser} from "../../common/decorators/auth-user.decorator";
import {Roles} from "../auth/decorator/roles.decorator";

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
      private readonly authService:AuthService,
           private readonly usersService: UsersService) {}

  // @UseGuards(JwtAuthGuard)
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

  @Post('/save')
  public async createLogin(@Body() createUserDto: CreateUserDto) {
       return this.usersService.createLogin(createUserDto);
  }

  // @Post('save')
  // async registerUser(
  //     @Body() registerUserDto: CreateUserDto,
  // ): Promise<LoginResponse> {
  //   const { username, password, ...rest } = registerUserDto;
  //
  //   const existingUser = await this.usersService.findUserWithPassword(username);
  //
  //   if (existingUser) {
  //     throw new BadRequestException('User already exists.');
  //   }
  //
  //   try {
  //     const saltRounds = 12;
  //     const hashedPassword = await bcrypt.hash(password, saltRounds);
  //     const user = await this.usersService.create({
  //       ...registerUserDto,
  //       password: hashedPassword,
  //     });
  //     const { id, role, tokenVersion } = user;
  //     const tokens = this.authService.assignTokens(id, role, tokenVersion);
  //
  //     return tokens;
  //   } catch (error) {
  //     throw new BadRequestException('Failed to register user.');
  //   }
  // }

  @Put('/update/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto).then((data) => {
      if (data.affected == 1) {
        return { success: true, message: 'Updated is record!!!' };
      } else {
        return { success: false, message: 'not updated is record!!!' };
      }
    });
  }

  @Post('/delete')
  deleteUsers(@Body() userid: number[]) {
    return this.usersService
      .deleteUsers(userid)
      .then((data) => {
        return data.affected != 0
          ? { success: true, message: 'Deleted is record!!!' }
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
    return this.authService.getLoggedUser(user.userId);
  }
}
