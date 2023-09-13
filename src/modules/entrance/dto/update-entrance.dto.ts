import { PartialType } from '@nestjs/swagger';
import { CreateEntranceDto } from './create-entrance.dto';

export class UpdateEntranceDto extends PartialType(CreateEntranceDto) {}
