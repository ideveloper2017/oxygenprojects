import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';
import { FloorModule } from './modules/floor/floor.module';
import { EntranceModule } from './modules/entrance/entrance.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { TownsModule } from './modules/towns/towns.module';
import { PriceModule } from './modules/price/price.module';
import { OrderItemsModule } from './modules/order-items/order-items.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentMethodModule } from './modules/payment-method/payment-method.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CreditTableModule } from './modules/credit-table/credit-table.module';
import { ClientsModule } from './modules/clients/clients.module';
import { SalesModule } from './modules/sales/sales.module';
import { RegionModule } from './modules/region/region.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { ExchangRatesModule } from './modules/exchang-rates/exchang-rates.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // TypeOrmModule.forRoot({
    //   type: process.env.DB_TYPE as any,
    //   host: process.env.DB_HOST,
    //   port: parseInt(process.env.DB_PORT),
    //   username: process.env.DB_USERNAME,
    //   password: process.env.DB_PASSWORD,
    //   database: process.env.DB_NAME,
    //   entities: [__dirname + '/../**/*.entity.{js,ts}'],
    //   synchronize: true,
    // }),
    DatabaseModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    UsersModule,
    ApartmentsModule,
    FloorModule,
    EntranceModule,
    BuildingsModule,
    TownsModule,
    PriceModule,
    OrderItemsModule,
    OrdersModule,
    PaymentMethodModule,
    PaymentsModule,
    CreditTableModule,
    ClientsModule,
    SalesModule,
    RegionModule,
    CurrenciesModule,
    ExchangRatesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
