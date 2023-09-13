import { PartialType } from '@nestjs/swagger';
import { CreateCreditTableDto } from './create-credit-table.dto';

export class UpdateCreditTableDto extends PartialType(CreateCreditTableDto) {}
