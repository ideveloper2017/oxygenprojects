import { PartialType } from '@nestjs/swagger';
import { CreateCaisherDto } from './create-caisher.dto';

export class UpdateCaisherDto extends PartialType(CreateCaisherDto) {}
