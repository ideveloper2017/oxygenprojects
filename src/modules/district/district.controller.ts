import { Controller } from '@nestjs/common';
import { DistrictsService } from './district.service';

@Controller('district')
export class DistrictController {
  constructor(private readonly districtService: DistrictsService) {}
}
