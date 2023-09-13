import { PartialType } from "@nestjs/swagger";
import { CreatexchangeRateDto } from "./create-exchange-rate.dto";

export class EditExchangeRateDto extends PartialType(CreatexchangeRateDto) {}