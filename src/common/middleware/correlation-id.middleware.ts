import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { trace, context } from '@opentelemetry/api';

const CORRELATION_ID_HEADER = 'x-correlation-id';
const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      (req.headers[REQUEST_ID_HEADER] as string) ||
      randomUUID();

    (req as unknown as Record<string, unknown>)['correlationId'] =
      correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      activeSpan.setAttribute('correlation.id', correlationId);
    }

    next();
  }
}
