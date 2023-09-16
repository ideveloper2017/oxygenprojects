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
  HttpException,
  HttpStatus,
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
import { FileDto } from './dto/create-file-upload.dto';
import {stat } from 'fs';
import { FindFile } from './dto/find-files.dto';

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
        fileSize: 5*(Math.pow(1024, 2)), // 5MB},
    }
  })
  )
  
  async uploadFile(@Body() body: FileDto, @UploadedFile() file: Express.Multer.File) {

    return await this.fileService.saveLocalFileData({
      entity: body.entity,
      record_id: body.record_id,
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
      const file = await this.fileService.getFileById(id)

        const stream = createReadStream(join(process.cwd(), file.path));
    
        response.set({
          'Content-Disposition': `inline; filename="${file.filename}"`,
          'Content-Type': file.mimetype,
        });
        return new StreamableFile(stream);

    }
    
// ================================== to get many files  =================================
// @Post('/files')
// async getDatabaseFilesByIds(
//   @Body() fileDto: FindFile,
//   @Res({ passthrough: true }) response: Response,
// ) {
//   const files = await this.fileService.getFiles(fileDto)

//   const filePromises = files.map(file => {
//     const filePath = join(process.cwd(), file.path);

//     return new Promise((resolve, reject) => {
//       stat(filePath, (err, stats) => {
//         if (err || !stats.isFile()) {
//           if (err && err.message.includes('no such file or directory')) {
//             reject(new Error(`File not found: ${file.id}`));
//           } else {
//             reject(err);
//           }
//         } else {
//           const stream = createReadStream(filePath);
  
//           response.set({
//             'Content-Disposition': `inline; filename="${file.filename}"`,
//             'Content-Type': file.mimetype,
//           });
//           resolve(new StreamableFile(stream));
//         }
//       });
//     });
//   });

//   try {
//     const streamableFiles = await Promise.all(filePromises);
//     return streamableFiles;
//   } catch (error) {
//     console.error('Error occurred while retrieving files:', error);
//     throw error;
//   }
// }


  @Get()
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="package.json"')
  getStaticFile(): StreamableFile {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file);
  }
}
