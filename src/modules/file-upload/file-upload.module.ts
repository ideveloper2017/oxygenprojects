import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadController } from './file-upload.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Towns } from '../towns/entities/town.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Towns])],
  controllers: [FileUploadController],
  providers: [FileUploadService],
})
export class FileUploadModule {}
