// Initialize OpenTelemetry BEFORE any other imports
import './monitoring/tracer';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { json } from 'express';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);

  app.useLogger(logger);
  app.use(helmet());
  app.use(json({ limit: '1mb' }));
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const frontendOrigins = configService
    .get<string>('cors.frontendOrigins', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const corsUnrestrictedEnvs = ['development', 'test'];
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsUnrestrictedEnvs.includes(nodeEnv)) {
        callback(null, true);
        return;
      }

      const isAllowed = frontendOrigins.some((allowed) =>
        origin.includes(allowed),
      );
      callback(null, isAllowed);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: false,
    }),
  );

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);
}
bootstrap();
