import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { trace, context } from '@opentelemetry/api';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly tracer = trace.getTracer('prisma-service');

  constructor() {
    super({
      // Enable tracing and logging for better observability
      log: [
        {
          emit: 'stdout',
          level: 'query',
        },
        {
          emit: 'stdout',
          level: 'error',
        },
        {
          emit: 'stdout',
          level: 'info',
        },
        {
          emit: 'stdout',
          level: 'warn',
        },
      ],
    });

    // Add middleware to create spans for database operations
    this.$use(async (params, next) => {
      const span = this.tracer.startSpan(
        `prisma:${params.model}.${params.action}`,
        {
          attributes: {
            'db.operation': params.action,
            'db.collection.name': params.model || 'unknown',
            'db.system': 'postgresql',
          },
        },
      );

      return await context.with(
        trace.setSpan(context.active(), span),
        async () => {
          try {
            const result = await next(params);
            span.setStatus({ code: 1 }); // OK
            return result;
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
            throw error;
          } finally {
            span.end();
          }
        },
      );
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
