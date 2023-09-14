import { Body, Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Towns } from '../towns/entities/town.entity';
import { Repository } from 'typeorm';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';
import { RemoveFileDto } from './dto/remove-file.dto';

@ApiTags('FileUpload')
@Controller('file-upload')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService) {}

  @Post('/upload')
  @ApiConsumes('multipart/form-data')

  @ApiOperation({summary: 'Upload a file', description: 'Upload a file by selecting it using the upload button.',})
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })

  @UseInterceptors(FileInterceptor('file'))
  
  async uploadFile(@UploadedFile() file:Express.Multer.File, @Body() fileUploadDto: CreateFileUploadDto) {
    if (!file) {
      return {success: false, message:"yuklash uchun rasm tanlanmagan!!"}
    }

    try {

      const uploadingFile = await this.fileUploadService.uploadFile(file, fileUploadDto).then(data => {

        if (data.affected > 0) {
          return {success: true, message: "file uploaded successfully" }
        }else {
          return {success: false, message: "error while uploading" }
        }
      })
      
    } catch (error) {
      console.log(error);
      return {success: false, message: 'Fayl yuklashda xatolik'};
    }
  }

  @Post('/remove')
  @ApiOperation({summary: 'Delete file', description: 'town, bino , kvartira larga boglangan fileni ochirish',})

  removeFile(@Body() removeFileDto: RemoveFileDto) {
      return this.fileUploadService.deleteFile(removeFileDto).then(data => {
        if(data === undefined) {
          return {success: true, message: "File deleted successfully"}
        }else {
          return {success: false, message: "File not exists"}
          
      }
    }
      )

  }
}
