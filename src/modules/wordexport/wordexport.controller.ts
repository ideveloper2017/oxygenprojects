import { Controller, Get, Res } from '@nestjs/common';
// import fs from "fs";
import {TemplateHandler} from "easy-template-x";
const fs=require('fs');
@Controller('wordexport')
export class WordexportController {
  @Get('export')
  async exportWord(@Res() res) {
    const filename = 'data/contract.docx';
    const templateFile = fs.readFileSync('data/contract.docx');

    const data = {
      posts: [
        { author: 'Alon Bar', text: 'Very important\ntext here!' },
        { author: 'Alon Bar', text: 'Forgot to mention that...' }
      ]
    };

    const handler = new TemplateHandler();
    const doc = await handler.process(templateFile, data);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // You can set the appropriate MIME type
    res.send(doc)
    const fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
    // fs.writeFileSync('myTemplate - output.docx', doc);
  }


}
