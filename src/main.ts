// Initialize OpenTelemetry BEFORE any other imports
import './monitoring/tracer';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const frontendOrigins = configService
    .get<string>('FRONTEND_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Validate production configuration at startup
  if (frontendOrigins.length === 0 && process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_ORIGINS must be configured in production');
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || process.env.NODE_ENV !== 'production') {
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
  const port = configService.get('SERVICE_PORT');
  await app.listen(port || 3000);
}
bootstrap();
