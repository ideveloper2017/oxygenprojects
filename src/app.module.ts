import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {DatabaseModule} from './database/database.module';
import {AuthModule} from './modules/auth/auth.module';
import {UsersModule} from './modules/users/users.module';
import {RolesModule} from './modules/roles/roles.module';
import {PermissionsModule} from './modules/permissions/permissions.module';
import {ApartmentsModule} from './modules/apartments/apartments.module';
import {FloorModule} from './modules/floor/floor.module';
import {EntranceModule} from './modules/entrance/entrance.module';
import {BuildingsModule} from './modules/buildings/buildings.module';
import {TownsModule} from './modules/towns/towns.module';
import {PriceModule} from './modules/price/price.module';
import {OrderItemsModule} from './modules/order-items/order-items.module';
import {OrdersModule} from './modules/orders/orders.module';
import {PaymentMethodModule} from './modules/payment-method/payment-method.module';
import {PaymentsModule} from './modules/payments/payments.module';
import {CreditTableModule} from './modules/credit-table/credit-table.module';
import {ClientsModule} from './modules/clients/clients.module';
import {SalesModule} from './modules/sales/sales.module';
import {RegionModule} from './modules/region/region.module';
import {CurrenciesModule} from './modules/currencies/currencies.module';
import {ExchangRatesModule} from './modules/exchang-rates/exchang-rates.module';
import {FileUploadModule} from './modules/file-upload/file-upload.module';
import {ServeStaticModule} from '@nestjs/serve-static';
import {resolve} from 'path';
import {RolesService} from "./modules/roles/roles.service";
import {PermissionsService} from "./modules/permissions/permissions.service";
import {RegionsService} from "./modules/region/region.service";
import {DistrictsService} from "./modules/district/district.service";
import {UsersService} from "./modules/users/users.service";
import {PaymentMethodsService} from "./modules/payment-method/payment-method.service";
import {CurrenciesService} from "./modules/currencies/currencies.service";
import {Currencies} from "./modules/currencies/entities/currency.entity";
import {AuthMiddleware} from "./modules/auth/middleware/auth.middleware";
import { ScheduleModule } from '@nestjs/schedule';
import { TaskSchedulerModule } from './modules/task-scheduler/task-scheduler.module';
import { ReturnModule } from './modules/return/return.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        ServeStaticModule.forRoot({
            rootPath: resolve(__dirname, '../src/', 'images'),
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
        FileUploadModule,
        TaskSchedulerModule,
        ReturnModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule  implements NestModule{

      constructor(private regionService: RegionsService,
                      private disrtrictServ: DistrictsService,
                      private roleService: RolesService,
                      private permissionServ: PermissionsService,
                      private userserv: UsersService,
                      private paymentMethodServ: PaymentMethodsService,
                      private currencyServ: CurrenciesService) {

        regionService.fillDataRegion();
        disrtrictServ.fillDataDistrict();
        roleService.filldata();
        permissionServ.filldata();

        // userserv.createLogin({
        //     "first_name": "Admin",
        //     "last_name": "Admin",
        //     "username": "admin",
        //     "phone_number": "+998 94 995 1254",
        //     "password": "1234",
        //     "is_active": true,
        //     "role_id": 1
        // })

        // paymentMethodServ.addPaymentMethods([
        //     {
        //         name: 'Нақд',
        //         is_active: true
        //     },
        //     {
        //         name: 'Ипотека',
        //         is_active: true
        //     },
        //     {
        //         name: 'Доллар',
        //         is_active: true
        //     }, {
        //         name: 'Субсидиа',
        //         is_active: true
        //     },{
        //         name: 'daasdsaasd',
        //         is_active: true
        //     }
        // ])

          if (!Currencies.findOne({where:{is_selected:true}})){
              Currencies.save({
                  name: "USD",
                  is_selected: true
              })
          }



    }

    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }

}
