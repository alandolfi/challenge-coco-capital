// New Relic debe cargarse ANTES que cualquier otro módulo
if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './shared/infrastructure/telemetry/LoggingInterceptor';
import { TelemetryService } from './shared/infrastructure/telemetry/TelemetryService';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const telemetry = app.get(TelemetryService);
  app.useGlobalInterceptors(new LoggingInterceptor(telemetry));

  const config = new DocumentBuilder()
    .setTitle('Ports and adapters NestJS')
    .setDescription('Ports and adapters NestJS POC')
    .setVersion('1.0')
    .addTag('user')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
