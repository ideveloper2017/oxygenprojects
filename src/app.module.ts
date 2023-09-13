import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';



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

  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
