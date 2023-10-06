import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { FileDto } from './dto/create-file-upload.dto';
import { Apartments } from '../apartments/entities/apartment.entity';
import { Buildings } from '../buildings/entities/building.entity';
import { Towns } from '../towns/entities/town.entity';
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
      throw new NotFoundException('Image not exists');
    }
    return file;
  }

  async saveLocalFileData(fileDto: FileDto) {
    let updatingEntity, temp, propName;

    const file = new FileUpload();
    file.filename = fileDto.filename;
    file.path = fileDto.path;
    file.mimetype = fileDto.mimetype;
    const savedFile = await this.localFilesRepository.save(file);

    if (fileDto.entity == 'Apartments') {
      propName = 'apartment_id';
      temp = await this.localFilesRepository.findOne({
        where: { apartment_id: +fileDto.record_id },
      });

      updatingEntity = Apartments;
    } else if (fileDto.entity == 'Buildings') {
      propName = 'building_id';
      temp = await this.localFilesRepository.findOne({
        where: { building_id: +fileDto.record_id },
      });

      updatingEntity = Buildings;
    } else if (fileDto.entity == 'Towns') {
      propName = 'town_id';

      temp = await this.localFilesRepository.findOne({
        where: { town_id: +fileDto.record_id },
      });

      updatingEntity = Towns;
    }

    if (temp) {
      if (existsSync(temp.path)) {
        unlinkSync(temp.path);
      } else {
        throw new NotFoundException('Image path not exists');
      }
      await this.localFilesRepository.update(
        { [propName]: temp[propName] },
        {
          filename: savedFile.filename,
          path: savedFile.path,
          mimetype: savedFile.mimetype,
        },
      );
      await this.localFilesRepository.delete({ id: savedFile.id });
    } else {
      await this.localFilesRepository.update(
        { id: savedFile.id },
        { [propName]: +fileDto.record_id },
      );
    }
    await this.localFilesRepository.manager
      .getRepository(updatingEntity)
      .update(
        { id: fileDto.record_id },
        { file_id: temp ? temp.id : savedFile.id },
      );

    return temp ? temp : savedFile;
  }

}
