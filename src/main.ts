import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {ConfigService} from "@nestjs/config";
import {ValidationPipe} from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  app.setGlobalPrefix('/api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());
  const config   = new DocumentBuilder()
      .setTitle('Sales Appartment API Documentation')
      .setVersion('1.0')
      .addTag('Auth')
      .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(configService.get<number>('PORT'),()=>{
    console.log('Web', configService.get<string>('BASE_URL'));
  });
}
bootstrap();
