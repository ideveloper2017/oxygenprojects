import { Controller, Get, Res } from '@nestjs/common';

@Controller('wordexport')
export class WordexportController {
  @Get('export')
  async exportWord(@Res() res) {

  }
}
