import { Injectable } from '@nestjs/common';
import { SpanKind, SpanOptions, trace } from '@opentelemetry/api';

@Injectable()
export class TelemetryService {
  async withSpan<T>(
    spanName: string,
    fn: () => Promise<T>,
    options?: SpanOptions,
  ): Promise<T> {
    const tracer = trace.getTracer('constellation-service');
    return tracer.startActiveSpan(spanName, options || {}, async (span) => {
      try {
        const result = await fn();
        span.end();
        return result;
      } catch (error) {
        span.recordException(error);
        span.end();
        throw error;
      }
    });
  }

  addAttributes(attributes: Record<string, string | number>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  addEvent(name: string, attributes?: Record<string, string | number>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }
}
