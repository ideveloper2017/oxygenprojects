import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { FileDto } from './dto/create-file-upload.dto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

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
    // if (!file) {
    //   throw new NotFoundException('Image not found');
    // }
      return file ?? null; // Fayl topilmasa, null qaytaradi
  }

  async saveLocalFileData(fileDto: FileDto) {
    // Create a new file record
    const file = new FileUpload();
    file.filename = fileDto.filename;
    file.path = fileDto.path;
    file.mimetype = fileDto.mimetype;

    // Determine the entity type and set the appropriate relation
    let relationField: 'apartment_id' | 'building_id' | 'town_id' | null = null;
    
    switch (fileDto.entity) {
      case 'Apartments':
        relationField = 'apartment_id';
        break;
      case 'Buildings':
        relationField = 'building_id';
        break;
      case 'Towns':
        relationField = 'town_id';
        break;
      default:
        throw new NotFoundException('Invalid entity type');
    }

    // Start a transaction
    const queryRunner = this.localFilesRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find existing file for this entity
      const existingFile = await queryRunner.manager.findOne(FileUpload, {
        where: { [relationField]: +fileDto.record_id },
      });

      // If file exists, delete its physical file
      if (existingFile) {
        const fullPath = join(process.cwd(), existingFile.path);
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
        }
        // Remove the old file record
        await queryRunner.manager.remove(FileUpload, existingFile);
      }

      // Set the relation
      file[relationField] = +fileDto.record_id;
      
      // Save the new file
      const savedFile = await queryRunner.manager.save(FileUpload, file);
      
      // Commit transaction
      await queryRunner.commitTransaction();
      
      return { id: savedFile.id };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

}
