import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './entities/user.entity';
import { In, Repository } from 'typeorm';
import { Roles } from '../roles/entities/role.entity';
import * as bcrypt from 'bcryptjs';
import { Permissions } from '../permissions/entities/permission.entity';
import { ApiProperty } from '@nestjs/swagger';
import {Towns} from "../towns/entities/town.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async getUsers(id: number) {
    // user ga tegishli ruxsatlarni tartiblab beradi

    const permissions = await Permissions.find();

    const categories = [
      'user',
      'role',
      'permission',
      'clients',
      'sold',
      'report',
      'buildings',
      'dashboard',
    ];

    const sortedPermissions = categories.map((category) => {
      const filteredPermissions = permissions
        .filter((p) => p.name.startsWith(category))
        .map((p) => ({
          id: p.id,
          name: p.name,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));

      return { [category]: filteredPermissions };
    });
    // =========== user roles permissions =================

    let users;
    if (id != 0) {
      users = await this.usersRepository.findOne({
        relations: ['roles.permission','userTowns'],
      });
    } else {
      users = await this.usersRepository.find({
        relations: ['roles.permission','userTowns'],
      });
    }
    return users;
  }

  public async signIn(username: string) {
    return await this.usersRepository.manager
      .getRepository(Users)
      .findOne({ where: { username: username }, relations: ['roles'] })
      .then((data) => {
        return data;
      });
  }

  public async createLogin(createUserDto: CreateUserDto) {
    let role_id;
    try {
      const role = await this.usersRepository.manager
        .getRepository(Roles)
        .find({ where: { id: createUserDto.role_id } })
        .then((data) => {
          data.map((data) => {
            role_id = data;
          });
        });


      const town=await Towns.find({where:{id: In(createUserDto.town_id)}});
      const isExists = await this.usersRepository.findOne({where: {username: createUserDto.username}})
      if(isExists){
        return {success: false, message: "User already exists"}
      }
      const user = await this.usersRepository.save([
        {
          first_name: createUserDto.first_name,
          last_name: createUserDto.last_name,
          username: createUserDto.username,
          phone_number: createUserDto.phone_number,
          password: await bcrypt.hash(createUserDto.password, 10),
          is_active: createUserDto.is_active,
          user_is_deleted: false,
          roles: role_id,
          userTowns:town,
        },
      ]);
      return createUserDto;
    } catch (error) {
      throw new HttpException(
        error.message + ' ' + JSON.stringify(createUserDto),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // async create(user: CreateUserDto): Promise<UserResponse> {
  //   const newUser = await this.usersRepository.create(user);
  //   await this.usersRepository.save(newUser);
  //   const { password, created_at, updated_at, ...userResult } = newUser;
  //   return userResult;
  // }

  public async updateUser(id: number, updateUserDto: UpdateUserDto) {

    const town=await Towns.find({where:{id: In(updateUserDto.town_id)}});

    this.usersRepository.manager.query('delete from UserTown where UserTown.userId=${id}')

    return await this.usersRepository.update({id: id},
        {
          first_name: updateUserDto.first_name,
          last_name: updateUserDto.last_name,
          username: updateUserDto.username,
          phone_number: updateUserDto.phone_number,
          password: await bcrypt.hash(updateUserDto.password,10),
          is_active:updateUserDto.is_active,
          roles: await Roles.findOne({where: {id: updateUserDto.role_id}}),
          userTowns:town
        }
    );
  }

  public async deleteUsers(userid: number[]) {
    let counter = 0 
    for(let i of userid) {
        let temp = await this.usersRepository.update({id: i}, {user_is_deleted: true, is_active: false})
      counter += temp.affected
      }

      return counter == userid.length
  }

  async findOneById(id: number) {
    return await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
      
    });
  }

  async findUserWithPassword(username: string): Promise<Users> {
    return await this.usersRepository.findOne({
      where: { username: username },
    });
  }


  async createdefaultUser(){
    const user=await this.usersRepository.find();
    if (user.length==0){
      this.usersRepository.save([{
        first_name: "Admin",
        last_name: "Admin",
        username: "admin",
        phone_number: "+998 94 995 1254",
        password: await bcrypt.hash("1234",10),
        is_active: true,
        user_is_deleted: false,
        roles: await Roles.findOne({where:{id:1}})
      }]);
    }
  }

  public async getRoles() {
    return this.usersRepository.manager.getRepository(Roles).find();
  }

  public async getPermission() {
    return this.usersRepository.manager
      .getRepository(Permissions)
      .find({ relations: ['roles'] });
  }

  public async recoverUsers(arrayOfId: number[]){
    let counter = 0 
    for(let i of arrayOfId) {
        let temp = await this.usersRepository.update({id: i}, {user_is_deleted: false, is_active: true})
      counter += temp.affected
      }

      return counter == arrayOfId.length 
  }

}
