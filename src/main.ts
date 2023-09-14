import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';

async function bootstrap() {
  const app: NestExpressApplication = await NestFactory.create(AppModule);
  //   {
  //   cors: { origin: await bcrypt.hash(process.env.CLIENT_ORIGIN, 8) },
  // });
  const configService = app.get(ConfigService);
  app.setGlobalPrefix('/api');
  app.enableCors();
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe());
  const config = new DocumentBuilder()
    .setTitle('Sales Appartment API Documentation')
    .setVersion('1.0')
    .addTag('Auth')
    .addTag('Users')
    .addTag('Towns')
    .addTag('Buildings')
    .addTag('Entrances')
    .addTag('Floors')
    .addTag('Apartments')
    .addTag('Clients')
    .addTag('Regions')
    .addTag('Currencies')
    .addTag('PaymentMethods')
    .addTag('Orders')
    .addTag('OrderItems')
    .addTag('CreditTable')
    .addTag('FileUploads')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get<number>('PORT'), () => {
    console.log('Web', configService.get<string>('BASE_URL'));
  });
}
bootstrap();
