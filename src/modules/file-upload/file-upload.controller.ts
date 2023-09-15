import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';

@ApiTags('FileUpload')
@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file',
    description: 'Upload a file by selecting it using the upload button.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  
  async uploadFile(@Body() createFileDto: CreateFileUploadDto, @UploadedFile() file:Express.Multer.File) {
    if (!file) {
      return { success: false, message: 'yuklash uchun rasm tanlanmagan!!' };
    }

    const fileName = file.originalname
    // try {

      const uploadingFile = await this.fileUploadService.uploadFile(createFileDto, fileName, file).then(data => {
    //     if (data.affected > 0) {
    //       return {success: true, message: "file uploaded successfully" }
    //     }else {
    //       return {success: false, message: "error while uploading" }
    //     }
    //   })
      
    // } catch (error) {
    //   console.log(error);
    //   return {success: false, message: 'Fayl yuklashda xatolik'};
    })
  }

  @Get('/get/:fileId')
  @ApiOperation({summary: 'Get file', description: 'town, bino , kvartira larga boglangan fileni olish',})

  getFile(@Param('fileId') fileId: number) {
      return this.fileUploadService.findOneFile(fileId).then(data => {
        if(data === undefined) {
          return {success: true, message: "File deleted successfully"}
        }else {
          return {success: false, message: "File not exists"}
          
      }
    });
  }
}
