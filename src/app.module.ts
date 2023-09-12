import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from "./database/database.module";


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    //
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
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
