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
  const logger = app.get(Logger);
  app.useLogger(logger);

  // A single bad Teams SDK call (e.g. an orphaned promise from a connector-client
  // mismatch) must never take the whole server down for every user. Log and keep
  // running instead of letting Node's default behavior exit the process.
  process.on('unhandledRejection', (reason: any) => {
    logger.error(
      `Unhandled promise rejection: ${reason?.message || reason}`,
      reason?.stack,
      'process',
    );
  });
  process.on('uncaughtException', (err: Error) => {
    logger.error(`Uncaught exception: ${err.message}`, err.stack, 'process');
  });

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
