import { PartialType } from '@nestjs/swagger';
import { NewPaymentDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(NewPaymentDto) {}
