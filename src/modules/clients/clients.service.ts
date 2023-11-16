import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Clients } from './entities/client.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Clients) private readonly clientRepo: Repository<Clients>,
  ) {}

  async createClient(createClientDto: CreateClientDto, user_id: any) {
    try {
      const client = await this.clientRepo.findBy({
        passport_seria: createClientDto.passport_seria,
      });

      if (client.length != 0) {
        return {
          status: 409,
          success: true,
          message: 'Mijoz allaqachon mavjud!',
        };
      }

      let newClient = new Clients();
      newClient.first_name = createClientDto.first_name;
      newClient.last_name = createClientDto.last_name;
      newClient.middle_name = createClientDto.middle_name;
      newClient.gender = createClientDto.gender;
      newClient.type = createClientDto.type;
      newClient.address = createClientDto.address;
      newClient.contact_number = createClientDto.contact_number; //2023-08-13
      newClient.date_of_birth = createClientDto.date_of_birth;
      newClient.passport_seria = createClientDto.passport_seria;
      newClient.given_from = createClientDto.given_from;
      newClient.given_date = createClientDto.given_date;
      newClient.untill_date = createClientDto.untill_date;
      newClient.legal_address = createClientDto.legal_address;
      newClient.registered_address = createClientDto.registered_address;
      newClient.description = createClientDto.description;
      newClient.tin = createClientDto.tin;
      newClient.user_id = user_id.userId;
      newClient = await this.clientRepo.save(newClient);

      return {
        status: 200,
        success: true,
        data: newClient,
        message: "Mijoz ro'yxatga qo'shildi",
      };
    } catch (error) {
      if (error.code === '23505') {
        return {
          message: 'Duplicate key value violates unique constraint',
          status: 409,
        };
      }
    }
  }

  async findAllClients(offset: number, limit: number) {
    const clients = await this.clientRepo.find({
      skip: offset,
      take: limit,
      order: { id: 'desc' },
      relations: ['users'],
    });
    return { status: 200, data: clients, message: "Mijozlar ro'yxati" };
  }

  async findOneClient(id: number) {
    const client = await this.clientRepo.findBy({ id: id });
    if (!client) {
      return { status: 400, message: 'client not fount' };
    }
    return { status: 200, data: client, message: 'success' };
  }

  async editClientInfo(id: number, updateClientDto: UpdateClientDto,user_id:any) {
    try {
      const updatedClient = await this.clientRepo
        .createQueryBuilder()
        .update(Clients)
        .set({
          first_name: updateClientDto.first_name,
          last_name: updateClientDto.last_name,
          middle_name: updateClientDto.middle_name,
          gender: updateClientDto.gender,
          type: updateClientDto.type,
          address: updateClientDto.address,
          contact_number: updateClientDto.contact_number,
          date_of_birth: updateClientDto.date_of_birth,
          passport_seria: updateClientDto.passport_seria,
          given_from: updateClientDto.given_from,
          given_date: updateClientDto.given_date,
          untill_date: updateClientDto.untill_date,
          legal_address: updateClientDto.legal_address,
          registered_address: updateClientDto.registered_address,
          description: updateClientDto.description,
          tin: updateClientDto.tin,
          user_id: user_id.userId,
        })
        .where('id = :id', { id })
        .execute();

      if (updatedClient.affected) {
        return {
          success: true,
          message: "Mijoz ma'lumotalri tahrirlandi",
        };
      } else {
        return {
          success: false,
          message: 'Mijoz tahrirlanmadi',
        };
      }
    } catch (error) {
      if (error.code === '23505') {
        return {
          status: 409,
          message: 'Duplicate key value violates unique constraint',
          errorcode: error.code,
        };
      }
    }
  }
}
