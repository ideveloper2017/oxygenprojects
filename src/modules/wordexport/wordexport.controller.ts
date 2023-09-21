import { Controller, Get, Res } from '@nestjs/common';
import fs from "fs";
import {TemplateHandler} from "easy-template-x";

@Controller('wordexport')
export class WordexportController {
  @Get('export')
  async exportWord(@Res() res) {
    const templateFile = fs.readFileSync('data/contract.docx');

    const data = {
      posts: [
        { author: 'Alon Bar', text: 'Very important\ntext here!' },
        { author: 'Alon Bar', text: 'Forgot to mention that...' }
      ]
    };

    const handler = new TemplateHandler();
    const doc = await handler.process(templateFile, data);

    fs.writeFileSync('myTemplate - output.docx', doc);
  }


}
