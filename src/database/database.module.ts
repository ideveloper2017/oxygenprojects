import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import * as process from 'process';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/../**/*.entity.{js,ts}'],
        synchronize: true,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {
  constructor() {
    console.log(process.env.DB_TYPE);
  }
}
