import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { LoggingInterceptor } from './common/interceptor/logging.interceptor';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app: NestExpressApplication = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.setGlobalPrefix('/api');
  app.enableCors({
    origin: ['http://localhost:5173','https://oxygenhouse.uz','https://oxy.brainsmart.uz'],
    credentials: true,
    exposedHeaders: ['set-cookie'],
  });
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Sales Appartment API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
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
    .addTag('FileUpload')
    .addTag('Bookings')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get<number>('PORT'), () => {
    console.log('Web', configService.get<string>('BASE_URL'));
  });
}
bootstrap();
