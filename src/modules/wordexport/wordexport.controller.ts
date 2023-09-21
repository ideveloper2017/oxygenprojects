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

   saveFile(filename, blob) {

    // see: https://stackoverflow.com/questions/19327749/javascript-blob-filename-without-link

    // get downloadable url from the blob
    const blobUrl = URL.createObjectURL(blob);

    // create temp link element
    let link = document.createElement("a");
    link.download = filename;
    link.href = blobUrl;

    // use the link to invoke a download
    document.body.appendChild(link);
    link.click();

    // remove the link
    setTimeout(() => {
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      link = null;
    }, 0);
  }

}
