import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { extname, join } from 'path';
import { FileUploadService } from './file-upload.service';
import { FileUploadInterceptor } from './file-upload.interceptor';
import { FileDto } from './dto/create-file-upload.dto';

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
          return callback(
            new BadRequestException('Provide a valid image'),
            false,
          );
        }
        callback(null, true);
      },

      limits: {
        fileSize: 3 * Math.pow(1024, 2), // 3MB},
      },
    }),
  )
  uploadFile(@Body() body: FileDto, @UploadedFile() file: Express.Multer.File) {
    return this.fileService
      .saveLocalFileData({
        entity: body.entity,
        record_id: body.record_id,
        path: file.path,
        filename: file.originalname,
        mimetype: file.mimetype,
      })
      .then((data) => {
        if (data) {
          return { success: true, data, message: 'Rasm joylandi!!' };
        } else if (data == false) {
          return { success: false, message: 'Rasm allaqachon mavjud' };
        } else {
          return { success: false, message: 'Rasm yuklashda xatolik' };
        }
      });
  }

  @Get(':id')
  async getDatabaseFileById(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.fileService.getFileById(id);

    if (existsSync(file.path)) {
      const stream = createReadStream(join(process.cwd(), file.path));

      response.set({
        'Content-Disposition': `inline; filename="${file.filename}"`,
        'Content-Type': file.mimetype,
      });
      return new StreamableFile(stream);
    } else {
      return { success: false, message: 'image not found or may be deleted' };
    }
  }

  @Get()
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="package.json"')
  getStaticFile(): StreamableFile {
    const file = createReadStream(join(process.cwd(), 'package.json'));
    return new StreamableFile(file);
  }
}
