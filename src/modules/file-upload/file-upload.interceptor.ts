import { FileInterceptor } from '@nestjs/platform-express';
import {
  Injectable,
  mixin,
  NestInterceptor,
  Type,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Interfeysni to'g'rilash
interface LocalFilesInterceptorOptions {
  fieldName: string;
  path?: string;
  fileFilter?: (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => void;
  limits?: { fileSize?: number };
}

export function FileUploadInterceptor(
  options: LocalFilesInterceptorOptions,
): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    fileInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const filesDestination =
        configService.get('UPLOADED_FILES_DESTINATION') || './uploads';
      const destination = `${filesDestination}${options.path || ''}`;

      // Multer sozlamalari
      const multerOptions: MulterOptions = {
        storage: diskStorage({
          destination,
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname); // Fayl kengaytmasini olish
            const filename = `${uniqueSuffix}${ext}`;
            cb(null, filename);
          },
        }),
        fileFilter:
          options.fileFilter ||
          ((req, file, cb) => {
            // Standart fileFilter: faqat rasm fayllarini qabul qilish
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
            const ext = extname(file.originalname).toLowerCase();
            if (!allowedExtensions.includes(ext)) {
              return cb(
                new BadRequestException(
                  'Faqat rasm fayllari (.jpg, .jpeg, .png, .gif) ruxsat etiladi',
                ),
                false,
              );
            }
            if (!file.mimetype.includes('image')) {
              return cb(
                new BadRequestException("Fayl turi rasm bo'lishi kerak"),
                false,
              );
            }
            cb(null, true);
          }),
        limits: options.limits || { fileSize: 3 * 1024 * 1024 }, // 3MB standart cheklov
      };

      // FileInterceptor ni ishlatish
      this.fileInterceptor = new (FileInterceptor(
        options.fieldName,
        multerOptions,
      ))();
    }

    intercept(...args: Parameters<NestInterceptor['intercept']>) {
      return this.fileInterceptor.intercept(...args);
    }
  }

  return mixin(Interceptor);
}
