import { Module } from '@nestjs/common';
import { Permissions } from '../permissions/entities/permission.entity';
import { PermissionsService } from './permissions.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Permissions])],
  controllers: [],
  providers: [PermissionsService],
  exports: [TypeOrmModule, PermissionsService],
})
export class PermissionsModule {}
