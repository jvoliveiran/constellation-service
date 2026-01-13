import 'dotenv/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_TELEMETRY_SDK_NAME,
  ATTR_TELEMETRY_SDK_LANGUAGE,
  ATTR_TELEMETRY_SDK_VERSION,
} from '@opentelemetry/semantic-conventions';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import { logs } from '@opentelemetry/api-logs';
import { OpenTelemetryTransport } from './winston.transporter';

export const otelTransport = new OpenTelemetryTransport();

const buildHeaders = () => {
  const headers: Record<string, string> = {};
  const authToken = process.env['OTLP_AUTH_TOKEN'];

  if (authToken) {
    headers['Authorization'] = authToken;
  }

  return headers;
};

const buildOtlpUrl = (signal: 'traces' | 'metrics' | 'logs'): string => {
  const grafanaEndpoint =
    process.env['OTLP_ENDPOINT'] || process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];

  if (grafanaEndpoint) {
    // Remove trailing slash if present
    const baseUrl = grafanaEndpoint.replace(/\/$/, '');
    const fullUrl = `${baseUrl}/v1/${signal}`;
    return fullUrl;
  }

  // Fallback to local OTLP endpoint
  const host = process.env['OTLP_HOST'] || 'localhost';
  const port = process.env['OTLP_PORT'] || '4318';
  return `http://${host}:${port}/v1/${signal}`;
};

const exporterConfig = {
  compression: CompressionAlgorithm.GZIP,
  timeoutMillis: 30000,
  concurrencyLimit: 10,
};

const traceExporter = new OTLPTraceExporter({
  url: buildOtlpUrl('traces'),
  headers: buildHeaders(),
  ...exporterConfig,
});

const metricExporter = new OTLPMetricExporter({
  url: buildOtlpUrl('metrics'),
  headers: buildHeaders(),
  ...exporterConfig,
});

const logExporter = new OTLPLogExporter({
  url: buildOtlpUrl('logs'),
  headers: buildHeaders(),
  ...exporterConfig,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 60000,
});

const logProcessor = new BatchLogRecordProcessor(logExporter);

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]:
    process.env['OTEL_SERVICE_NAME'] ?? 'constellation-service',
  'service.namespace': process.env['OTEL_SERVICE_NAMESPACE'] ?? 'constellation',
  [ATTR_SERVICE_VERSION]: process.env['OTEL_SERVICE_VERSION'] ?? '1.0.0',
  'deployment.environment':
    process.env['DEPLOYMENT_ENVIRONMENT'] ??
    process.env['NODE_ENV'] ??
    'development',
  [ATTR_TELEMETRY_SDK_NAME]: 'opentelemetry',
  [ATTR_TELEMETRY_SDK_LANGUAGE]: 'nodejs',
  [ATTR_TELEMETRY_SDK_VERSION]: '1.28.0',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  logRecordProcessor: logProcessor,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          return ['/metrics', '/traces', '/logs', '/api/health'].some((path) =>
            req.url?.includes(path),
          );
        },
      },
    }),
    // Winston instrumentation for automatic log correlation
    new WinstonInstrumentation({
      enabled: true,
      logHook: (_span, record) => {
        record['resource.service.name'] =
          resource.attributes[ATTR_SERVICE_NAME];
        record['resource.service.namespace'] = 'constellation';
        record['resource.service.version'] = '1.0.0';
        record['resource.deployment.environment'] = 'production';
      },
    }),
  ],
});

sdk.start();

otelTransport.setLoggerProvider(logs.getLoggerProvider());

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => {
      console.log('Tracing terminated');
    })
    .catch((error: unknown) => {
      console.log('Error terminating tracing', error);
    })
    .finally(() => {
      process.exit(0);
    });
});

export default sdk;
