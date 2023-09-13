import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TownService } from './towns.service';
import { TownController } from './towns.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { Towns } from './entities/town.entity';
import { RegionModule } from '../region/region.module';
import { DistrictModule } from '../district/district.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Towns]),
    RegionModule,
    DistrictModule,
    RolesModule,
    PermissionsModule,
  ],
  providers: [TownService],
  controllers: [TownController],
  exports: [TypeOrmModule],
})
export class TownsModule {}
