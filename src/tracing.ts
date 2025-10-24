import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const traceExporter = new OTLPTraceExporter({
  url:
    process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] ??
    'http://localhost:4318/v1/traces',
});

// Initialize the OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter,
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'constellation-service',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
  }),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable file system instrumentation as it can be noisy
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      // Configure Redis instrumentation for Bull queues
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
      // Configure PostgreSQL instrumentation for Prisma
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
    }),
    // Add specific instrumentations for our stack
    new WinstonInstrumentation({
      enabled: true,
      // Include log correlation with traces
      logHook: (span, record) => {
        record['trace_id'] = span.spanContext().traceId;
        record['span_id'] = span.spanContext().spanId;
      },
    }),
    new NestInstrumentation({
      enabled: true,
    }),
    new GraphQLInstrumentation({
      enabled: true,
      // Capture GraphQL operation details
      mergeItems: true,
      allowValues: true,
    }),
    new HttpInstrumentation({
      enabled: true,
      // Ignore metrics endpoint and health checks to reduce noise
      ignoreIncomingRequestHook: (req) => {
        const url = req.url || '';
        return (
          url.includes('/metrics') ||
          url.includes('/health') ||
          url.includes('/favicon.ico') ||
          url.includes('/robots.txt') ||
          url.startsWith('/_next/') || // Next.js assets (if used)
          url.startsWith('/static/') || // Static assets
          url.endsWith('.js') ||
          url.endsWith('.css') ||
          url.endsWith('.png') ||
          url.endsWith('.jpg') ||
          url.endsWith('.svg')
        );
      },
      // Capture request/response headers (be careful with sensitive data)
      requestHook: (span, request) => {
        if ('getHeader' in request && typeof request.getHeader === 'function') {
          span.setAttributes({
            'http.request.header.user-agent':
              request.getHeader('user-agent') || '',
          });
        }
      },
    }),
    new ExpressInstrumentation({
      enabled: true,
    }),
    new PrismaInstrumentation(),
  ],
});

// Start the SDK
sdk.start();

console.log('OpenTelemetry tracing initialized');
console.log('Loaded instrumentations:');
console.log('- PrismaInstrumentation: enabled');
console.log('- PostgreSQL (pg): enabled via auto-instrumentations');
console.log('- HTTP, GraphQL, NestJS, Winston, Express: enabled');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.log('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

export default sdk;
