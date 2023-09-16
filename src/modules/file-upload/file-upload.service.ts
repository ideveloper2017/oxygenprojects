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
import { LocalFileDto } from './dto/create-file-upload.dto';

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

  async saveLocalFileData(fileData: LocalFileDto) {
    const newFile = await this.localFilesRepository.create(fileData);
    await this.localFilesRepository.save(newFile);
    return newFile;
  }
}
