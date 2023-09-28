import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateClientDto } from './dto/create-client.dto';
import { Clients } from './entities/client.entity';
import { ClientsService } from './clients.service';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @ApiOperation({ summary: "Yangi mijoz qo'shish" })
  @ApiResponse({ status: 201, description: "Mijoz qo'shildi!" })
  @Post('/create')
  createClient(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.createClient(createClientDto);
  }

  @ApiOperation({ summary: "Mavjud mijozlar ro'yxati" })
  @ApiResponse({ status: 200, type: Clients })
  @Get('/all')
  getAllClients(@Query('page') page: number) {
    const limit = 20;
    const offset = (page - 1) * limit;
    return this.clientsService.findAllClients(offset, limit);
  }

  @ApiOperation({ summary: "Mijoz ma'lumotlarini tahrirlash" })
  @ApiResponse({ status: 200, description: "Mijoz ma'lumotlari tahrirlandi." })
  @Patch('/edit/:id')
  updateClient(
    @Param('id') id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.editClientInfo(id, updateClientDto);
  }

  @ApiOperation({ summary: "Mijoz ma'lumotlari" })
  @ApiResponse({ status: 200, type: Clients })
  @Get('/:id')
  getClientById(@Param('id') id: number) {
    return this.clientsService.findOneClient(id);
  }
}
