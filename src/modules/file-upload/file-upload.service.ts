// import { HttpException, HttpStatus, Injectable, NotFoundException, UploadedFile } from '@nestjs/common';
// import * as  path from 'path';
// import * as fs from 'fs';
// import { v4 as uuidv4 } from 'uuid';
// import { Repository } from 'typeorm';
// import { InjectRepository } from '@nestjs/typeorm';
// import { FileUpload } from './entities/file-upload.entity';

// @Injectable()
// export class FileUploadService {
//     constructor(@InjectRepository(FileUpload) private readonly fileRepository: Repository<FileUpload>){} 

//   async uploadFile(dataBuffer: Buffer, filename: string) {
//     const newFile = new FileUpload()
//       newFile.name = filename,
//       newFile.content = dataBuffer
    
//       await this.fileRepository.save(newFile);
//     return newFile;
//   }
 
//   async getFileById(fileId: number) {
//     const file = await this.fileRepository.findOne({where: {id: fileId}});
//     if (!file) {
//       throw new NotFoundException();
//     }
//     return file;
//   }
// }
 

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { FileDto } from './dto/create-file-upload.dto';
import { FindFile } from './dto/find-files.dto';

@Injectable()
export class FileUploadService {
  constructor(
    @InjectRepository(FileUpload)
    private localFilesRepository: Repository<FileUpload>,
  ) {}

  async getFileById(fileId: number) {
    const file = await this.localFilesRepository.findOne({
      where: { id: fileId },
    });
    if (!file) {
      throw new NotFoundException();
    }
    return file;
  }
  
  async getFiles(fileDto: FindFile) { // hozircha ishlamaydi

    const res_id = fileDto.record_id
    const file = await this.localFilesRepository.createQueryBuilder('file')
    .where(`file.${fileDto.entity} = :res_id`, { res_id})
    .getMany();

    console.log(file);

    if (!file) {
      throw new NotFoundException();
    }
    return file;
  }
  
  async saveLocalFileData(fileDto: FileDto) {
    const file = new FileUpload();
      file.filename = fileDto.filename
      file.path = fileDto.path
      file.mimetype = fileDto.mimetype

      if(fileDto.entity == 'Apartments'){
      
        file.apartment_id =  +fileDto.record_id
      
      }else if(fileDto.entity == 'Buildings'){
      
        file.building_id =  +fileDto.record_id
        
      }else if(fileDto.entity == "Towns"){
      
        file.town_id =  +fileDto.record_id
      }

      const savedFile = await this.localFilesRepository.save(file)

      return savedFile
  }
}


