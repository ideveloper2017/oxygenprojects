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
import { DeepPartial, Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { FileDto } from './dto/create-file-upload.dto';
import { FindFile } from './dto/find-files.dto';
import { Apartments } from '../apartments/entities/apartment.entity';
import { Buildings } from '../buildings/entities/building.entity';
import { Towns } from '../towns/entities/town.entity';
import { UpdateFile } from './dto/update-file.dto';
import { existsSync, unlinkSync } from 'fs';

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
    if(fileDto.image_id == 0){
      
      // const check = await this.localFilesRepository.findOne({where: {filename: fileDto.filename}})
      // if(check){
      //   return false
      // }
      const file = new FileUpload();
      file.filename = fileDto.filename
      file.path = fileDto.path
      file.mimetype = fileDto.mimetype
      const savedFile = await this.localFilesRepository.save(file)

      if(fileDto.entity == 'Apartments'){
        
        await this.localFilesRepository.update({id: savedFile.id}, {apartment_id: +fileDto.record_id})
        await Apartments.update({id: fileDto.record_id}, {file_id: savedFile.id})
        
      }else if(fileDto.entity == 'Buildings'){
        await this.localFilesRepository.update({id: savedFile.id}, {building_id: +fileDto.record_id})
        await Buildings.update({id: fileDto.record_id}, {file_id: savedFile.id})
        
        
      }else if(fileDto.entity == "Towns"){
        await this.localFilesRepository.update({id: savedFile.id}, {town_id: +fileDto.record_id})
        await Towns.update({id: fileDto.record_id}, {file_id: savedFile.id})
        
      }
      
      return savedFile

    }else {

      //agar rasm yangilanadigan bo'lsa  else blok ishlaydi va eski rasm ochiriladi yangisi yoziladi
      try{
      let file
      if(fileDto.entity == 'Apartments'){
        console.log('apartment');
        file = await this.localFilesRepository.findOne({where: {id: +fileDto.image_id, apartment_id: fileDto.record_id}})
        
      }else if(fileDto.entity == 'Buildings'){
        console.log('buildings');
        file = await this.localFilesRepository.findOne({where: {id: +fileDto.image_id, building_id: fileDto.record_id}})
        
        
      }else if(fileDto.entity == "Towns"){
        console.log('towns');
        file = await this.localFilesRepository.findOne({where: {id: +fileDto.image_id, town_id: fileDto.record_id}})
      }
      console.log(file.path);


      if(existsSync(file.path)){

        unlinkSync(file.path)
      }else {
        return null
      }

      console.log(file.path);

      const updatingFile = await this.localFilesRepository.update({id: +fileDto.image_id}, {
        mimetype: fileDto.mimetype,
        path: fileDto.path,
        filename: fileDto.filename
      })

      let res;

      if(updatingFile.affected != 0){
        res = await this.localFilesRepository.findOne({where: {id: +fileDto.image_id}})
        console.log(res.path);
      } 

      
      if(fileDto.entity == 'Apartments'){
        
        res.apartment_id =  +fileDto.record_id
        await Apartments.update({id: fileDto.record_id}, {file_id: res.id})
        
      }else if(fileDto.entity == 'Buildings'){
        await Buildings.update({id: fileDto.record_id}, {file_id:res.id })
        
      }else if(fileDto.entity == "Towns"){
        await Towns.update({id: fileDto.record_id}, {file_id: res.id})
        
      }
      return  res
    }catch(error) {
      if(error.code === 'ENOENT'){
        console.log('not found');
      }
    }
    }

  }

  async updateImage (updateImageDto: UpdateFile) {

  }
}


