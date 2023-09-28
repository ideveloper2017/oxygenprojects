import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TownService } from './towns.service';
import { TownController } from './towns.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { Towns } from './entities/town.entity';
import { RegionModule } from '../region/region.module';
import { DistrictModule } from '../district/district.module';
import { PaymentMethodModule } from '../payment-method/payment-method.module';
import { UsersModule } from '../users/users.module';
import { CurrenciesModule } from '../currencies/currencies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Towns]),
    RegionModule,
    DistrictModule,
    RolesModule,
    PermissionsModule,
    PaymentMethodModule,
    CurrenciesModule
    
  ],
  providers: [TownService],
  controllers: [TownController],
  exports: [TownService],
})
export class TownsModule {}
