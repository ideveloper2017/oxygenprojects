import { Controller } from '@nestjs/common';
import { WordexportService } from './wordexport.service';

@Controller('wordexport')
export class WordexportController {
  constructor(private readonly wordexportService: WordexportService) {}
}
