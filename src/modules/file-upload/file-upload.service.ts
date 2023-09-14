import { HttpException, HttpStatus, Injectable, UploadedFile } from '@nestjs/common';
import * as  path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';
import { Repository } from 'typeorm';
import { Towns } from '../towns/entities/town.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RemoveFileDto } from './dto/remove-file.dto';

@Injectable()
export class FileUploadService {
    constructor(@InjectRepository(Towns) private readonly repository: Repository<Towns>){}
  
    // file upload core module usuli fs module bilan

  async uploadFile(file, fileUploadDto: CreateFileUploadDto) {
    try {

      // qaytarilmas nom bilan fileni nomlash
      const fileName = uuidv4() + `.${file.originalname.split('.')[file.originalname.split('.').length -1]}`


      const filePath = path.resolve(__dirname,'../..', 'images') // filelar yuklanishi uchun manzil
      

      if(!fs.existsSync(filePath)){
        
        // agarda filelar saqlanishi uchun manzil korsatilmagan bo'la uni o'zi ochadi
        fs.mkdirSync(filePath, {recursive: true})
      }
      
      fs.writeFileSync(path.join(filePath, fileName), file.buffer) // fileni belgilangan manzilga joylash
      
      // file brauzerda korinishi uchun uni asosiy url bilan birlashtiradi
      const imageLink = process.env.RETURN_LINK + fileName
     
      // yuklangan file ni tegishli tablitsaga joylash
      const setImageLink = await this.repository.manager.getRepository(fileUploadDto.entity).update({id: fileUploadDto.record_id}, {image_link: imageLink})
      
      return setImageLink
      
    } catch (error) {
    
        new HttpException('Failed to upload file', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

    async deleteFile(removeFileDto: RemoveFileDto) {

      try {

        const {entity_name, id} = removeFileDto // dto dan tablitsa nomi va rasmi o'chirilishi kerak bo'lgan qator id si keladi

        // X Tablistadan id boyicha qidirib rasm saqlangan manzilni topadi
        const {image_link} = await this.repository.manager.getRepository(entity_name).findOne({where: {id: id}, select: ['image_link']})

        // linkdan file nomini ajratib oladi
        const fileName = path.basename(image_link);

        //file nomini u joylashgan papka bilan birlashtiradi
        const filePath = path.resolve(__dirname, '../..', 'images', fileName);
        
        // fileni ochiradi -- fs.unlinkSync orqali 
        const res = fs.unlinkSync(filePath);


        return res;
  
      } catch (error) {
        // agar rasm yoq bo'lsa ogohlantirish bildirish  uchun controllerga false qaytaradi 
        
        if(error.message.substring('no such file or directory')){
          return false
        }
        // kutilmagan xatolik yuz bersa istisno xabar qaytaradi
        throw new HttpException(
          'Failed to delete file',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }




// ---------------- file yuklashning multer dan foydalanilgan usuli - -----------------

// private readonly storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, process.env.UPLOADED_FILES_DESTINATION);
//   },
//   filename: (req, file, cb) => {
//     const uniqueFilename = `${uuidv4()}${extname(file.originalname)}`;
//     cb(null, uniqueFilename);
//   },
// });

// private readonly upload = multer({ storage: this.storage });

// async uploadFile(file) {

//   return new Promise<string>((resolve, reject) => {
//     this.upload.single('file')(file, null, err => {
    
//       if (err) {
//         return reject(err);
//       }
//       resolve(file.filename);
//     });
//   });
    
// }