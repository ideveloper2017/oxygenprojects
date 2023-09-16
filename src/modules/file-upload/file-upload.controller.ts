// import { Body, Controller, Get, Param, ParseIntPipe, Post, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { FileUploadService } from './file-upload.service';
// import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
// import { Readable } from 'typeorm/platform/PlatformTools';
// import { Response } from 'express';

// @ApiTags('FileUpload')
// @Controller('file-upload')
// export class FileUploadController {
//   constructor(private readonly fileUploadService: FileUploadService) {}

//   // @Post('/upload')
//   // @ApiOperation({
//   //   summary: 'Upload a file',
//   //   description: 'Upload a file by selecting it using the upload button.',
//   // })
//   // @ApiConsumes('multipart/form-data')
//   // @ApiBody({
//   //   schema: {
//   //     type: 'object',
//   //     properties: {
//   //       file: {
//   //         type: 'string',
//   //         format: 'binary',
//   //       },
//   //     },
//   //   },
//   // })
//   // @UseInterceptors(FileInterceptor('file'))
  
//   @ApiOperation({ summary: 'Get image' })
//   @ApiProduces('image/*')
//   @ApiOkResponse()
//   @Get('/get/:fileId')
//   @ApiOperation({summary: 'Get file', description: 'town, bino , kvartira larga boglangan fileni olish',})
//   async getDatabaseFileById(@Res() response: Response, @Param('fileId', ParseIntPipe) fileId: number) {
//     const file = await this.fileUploadService.getFileById(fileId);
 
//     const stream = Readable.from(file.content);
//     stream.pipe(response);

//     return new StreamableFile(stream);
//   }

  
// }


import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  Get,
  Header,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { FileUploadService } from './file-upload.service';
import { FileUploadInterceptor } from './file-upload.interceptor';
import { LocalFileDto } from './dto/create-file-upload.dto';

@ApiTags('FileUpload')
@Controller('file-upload')
export class FileUploadController {
  constructor(private fileService: FileUploadService) {}
  @Post('upload')
  @ApiOperation({
         summary: 'Upload a file',
         description: 'Upload a file by selecting it using the upload button.',
       })
       @ApiConsumes('multipart/form-data')
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
  @UseInterceptors(
    FileUploadInterceptor({
      
      fieldName: 'file',
      
      path: '/images',
      
      fileFilter: (request, file, callback) => {
      
        if (!file.mimetype.includes('image')) {
         
          return callback(new BadRequestException('Provide a valid image'), false);
        }
        callback(null, true);
      },

      limits: {
        fileSize: Math.pow(1024, 2), // 1MB},
    }
  })
  )
  
  async uploadFile(@Body() body: LocalFileDto, @UploadedFile() file: Express.Multer.File) {
    return await this.fileService.saveLocalFileData({
      path: file.path,
      filename: file.originalname,
      mimetype: file.mimetype,
    }).then(data => {
      if(data){
        return {success: true, data, message: "file successfully uploaded"}
      }else {
        return {success: false, message: "failed to upload file"}

      }
    })
  }

  @Get(':id')
  async getDatabaseFileById(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.fileService.getFileById(id);

    const stream = createReadStream(join(process.cwd(), file.path));

    response.set({
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Content-Type': file.mimetype,
    });
    return new StreamableFile(stream);
  }

  @Get()
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="package.json"')
  getStaticFile(): StreamableFile {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file);
  }
}
