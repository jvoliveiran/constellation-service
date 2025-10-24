# OpenTelemetry Setup for Constellation Service

This document explains how OpenTelemetry has been configured in this NestJS application to automatically collect logs and traces.

## What's Included

### 1. Automatic Instrumentation
- **HTTP requests/responses** - All incoming and outgoing HTTP requests are automatically traced
  - ⚡ **Smart filtering:** Ignores `/metrics`, `/health`, static assets, and favicon requests
- **GraphQL operations** - GraphQL queries, mutations, and subscriptions are instrumented
- **Database queries** - PostgreSQL queries through Prisma are automatically traced
  - 🗄️ **Deep database visibility:** Individual SQL queries, connection times, and Prisma operations
- **Redis operations** - Bull queue operations and Redis commands are traced
- **Winston logging** - Logs are automatically correlated with traces

### 2. Manual Instrumentation
- **Custom spans** in PersonService with detailed attributes and events
- **Trace correlation** in logs (trace_id and span_id included)
- **Business logic tracking** with custom attributes and events

### 3. Infrastructure
- **Jaeger** for trace collection and visualization
- **Prometheus** for metrics collection (port 9464)

## Getting Started

### 1. Start the Infrastructure
```bash
# Start PostgreSQL, Redis, and Jaeger
npm run dev:up
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Jaeger UI on port 16686

### 2. Configure Environment
Copy `.env.example` to `.env` and adjust the values as needed:
```bash
cp .env.example .env
```

### 3. Start the Application
```bash
npm run dev
```

### 4. View Traces
- Open Jaeger UI: http://localhost:16686
- Raw metrics http://localhost:9464/metrics
- Select "constellation-service" from the service dropdown
- Click "Find Traces" to see collected traces

### 5. View Metrics
**Option A: Console Metrics (Default)**
- Metrics will be logged to the console every 30 seconds

**Option B: Prometheus Metrics**
- Metrics available at: http://localhost:9464/metrics
- Prometheus UI at: http://localhost:9090 (if using docker-compose)

## Testing the Setup

### GraphQL Operations
Visit http://localhost:3000/graphql and run:

```graphql
# Create a person (will generate traces)
mutation {
  createPerson(personInput: {
    name: "John Doe"
    email: "john@example.com"
  }) {
    id
    name
    email
  }
}

# Query all people
query {
  people {
    id
    name
    email
  }
}

# Query specific person
query {
  person(id: 1) {
    id
    name
    email
  }
}
```

### What You'll See in Jaeger
Jaeger UI: http://localhost:16686 (traces)

1. **HTTP spans** for incoming GraphQL requests
2. **GraphQL spans** for query/mutation execution
3. **Custom spans** from PersonService:
   - `PersonService.findAll`
   - `PersonService.findOne`
   - `PersonService.create`
   - `PersonService.create.database`
   - `PersonService.create.queue`
4. **Database spans** for Prisma operations
5. **Queue spans** for Bull job creation

### Log Correlation

Logs will include trace context:
```json
{
  "level": "info",
  "message": "Person created",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "traceId": "1234567890abcdef",
  "spanId": "abcdef1234567890",
  "context": "PersonService"
}
```

## Configuration Files

- `src/tracing.ts` - OpenTelemetry SDK initialization
- `src/telemetry/` - Custom telemetry service and module
- `docker-compose.yml` - Jaeger, Prometheus, and other services
- `prometheus.yml` - Prometheus scraping configuration

## Metrics Configuration

The setup supports flexible metrics configuration via environment variables:

### Prometheus Metrics
```bash
# Expose metrics for Prometheus scraping
OTEL_METRICS_EXPORTER=prometheus
PROMETHEUS_PORT=9464
PROMETHEUS_ENDPOINT=/metrics
```

## Custom Spans

The `TelemetryService` provides methods for manual instrumentation:

```typescript
// Wrap a function with a span
await this.telemetryService.withSpan('operation-name', async () => {
  // Your code here
});

// Add attributes to current span
this.telemetryService.addAttributes({
  'custom.attribute': 'value'
});

// Add events to current span
this.telemetryService.addEvent('custom.event', {
  key: 'value'
});
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_NAME` | Service name in traces | `constellation-service` |
| `SERVICE_VERSION` | Service version in traces | `1.0.0` |
| `JAEGER_ENDPOINT` | Jaeger collector endpoint | `http://localhost:14268/api/traces` |
| `PROMETHEUS_PORT` | Prometheus metrics port | `9464` |

## Troubleshooting

### No traces appearing in Jaeger
1. Check that Jaeger is running: `docker ps`
2. Verify the Jaeger endpoint in your `.env` file
3. Check application logs for OpenTelemetry initialization messages

### High trace volume
Adjust sampling in `src/tracing.ts`:
```typescript
// Add to NodeSDK configuration
sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10% of traces
```

### Performance impact
OpenTelemetry is designed for production use, but you can:
1. Disable specific instrumentations in `src/tracing.ts`
2. Use sampling to reduce trace volume
3. Configure batch export settings for better performance
