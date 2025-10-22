import { Injectable } from '@nestjs/common';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

@Injectable()
export class TelemetryService {
  private readonly tracer = trace.getTracer('constellation-service');

  /**
   * Create a custom span for manual instrumentation
   */
  createSpan(
    name: string,
    options?: { kind?: SpanKind; attributes?: Record<string, any> },
  ) {
    return this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
    });
  }

  /**
   * Execute a function within a span context
   */
  async withSpan<T>(
    name: string,
    fn: () => Promise<T> | T,
    options?: { kind?: SpanKind; attributes?: Record<string, any> },
  ): Promise<T> {
    const span = this.createSpan(name, options);

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        fn,
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add attributes to the current active span
   */
  addAttributes(attributes: Record<string, any>) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Add an event to the current active span
   */
  addEvent(name: string, attributes?: Record<string, any>) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(name, attributes);
    }
  }

  /**
   * Record an exception in the current active span
   */
  recordException(error: Error) {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error);
      activeSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  /**
   * Get the current trace ID for correlation
   */
  getCurrentTraceId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    return activeSpan?.spanContext().traceId;
  }

  /**
   * Get the current span ID for correlation
   */
  getCurrentSpanId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    return activeSpan?.spanContext().spanId;
  }
}
