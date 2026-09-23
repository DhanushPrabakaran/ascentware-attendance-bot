import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { AppModule } from './app.module';
import * as express from 'express';
import { SpaFilter } from './spa.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serve static assets
  const frontendPath = join(process.cwd(), 'frontend', 'dist');
  app.use(express.static(frontendPath));

  // Use the SPA filter to catch 404s and return index.html for frontend routes
  app.useGlobalFilters(new SpaFilter());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
