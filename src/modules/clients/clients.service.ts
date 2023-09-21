import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Clients } from './entities/client.entity';
import {QueryFailedError, Repository} from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Clients) private readonly clientRepo: Repository<Clients>,
  ) {}

  async createClient(createClientDto: CreateClientDto) {
    try{
      const client = await this.clientRepo.findBy({
        passport_seria: createClientDto.passport_seria,
      });

      if (client.length != 0) {
        return { status:409, success:true, message: 'Mijoz allaqachon mavjud!' };
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
        newClient = await this.clientRepo.save(newClient);

        return {
          status:200,
          success: true,
          data: newClient,
          message: "Mijoz ro'yxatga qo'shildi",
        };

    }catch (error){
      if (error.code === '23505') {
          return {message:'Duplicate key value violates unique constraint',errorcode:error.code}
      }
    }
  }

  async findAllClients() {
    const clients = await this.clientRepo.find({ order: { id: 'desc' } });
    return { status: 200, data: clients, message: "Mijozlar ro'yxati" };
  }

  async findOneClient(id: number) {
    const client = await this.clientRepo.find({ where:{id: id},relations:['orders.payments'] });
    return { status: 200, data: client, message: 'success' };
  }

  async editClientInfo(id: number, updateClientDto: UpdateClientDto) {
    try{
      const updatedClient = await this.clientRepo.update(
          { id: id },
          updateClientDto,
      );
      if (updatedClient.affected) {
        return { status: 400, data: [], message: 'Mijoz topilmadi!' };
      }
      return { status: 200, data: [], message: "Mijoz ma'lumotalri tahrirlandi" };
    } catch (error){

        if (error.code === '23505') {
          return {status: 409,message:'Duplicate key value violates unique constraint',errorcode:error.code}
        }

    }

  }
}
