import * as fs from 'fs';
import * as PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export const generateWordDocument = (data) => {
  const content = fs.readFileSync('data/shartnoma_oxy.docx', 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater();
  doc.loadZip(zip);

  // Ma'lumotlarni shablonga joylashtirish
  doc.setData(data);

  try {
    doc.render();
  } catch (error) {
    const e = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      properties: error.properties,
    };
    console.log(JSON.stringify({ error: e }));
    throw error;
  }

  const buffer = doc.getZip().generate({ type: 'nodebuffer' });

  return buffer;
};
