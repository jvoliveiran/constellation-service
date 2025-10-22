# OpenTelemetry Metrics Configuration Examples

This document shows different ways to configure metrics in your constellation service.

## Quick Start (No External Dependencies)

The default configuration uses console metrics, so you can start immediately:

```bash
# Start infrastructure (just PostgreSQL, Redis, Jaeger)
npm run dev:up

# Start the application (metrics will log to console)
npm run dev
```

You'll see metrics logged to your console every 30 seconds like:
```
{
  "resourceMetrics": [
    {
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "constellation-service"}}
        ]
      },
      "scopeMetrics": [...]
    }
  ]
}
```

## With Prometheus Dashboard

If you want a visual dashboard for metrics:

1. **Create `.env` file:**
```bash
# Enable Prometheus metrics
OTEL_METRICS_EXPORTER=prometheus
PROMETHEUS_PORT=9464

# Other required vars
DATABASE_PASSWORD=password
DATABASE_USER=username
DATABASE_NAME=constellation_db
DATABASE_PORT=5432
REDIS_PORT=6379
REDIS_PASSWORD=password
SERVICE_PORT=3000
```

2. **Start all services:**
```bash
npm run dev:up  # Starts PostgreSQL, Redis, Jaeger, AND Prometheus
npm run dev     # Start your app
```

3. **Access dashboards:**
- **Jaeger (traces):** http://localhost:16686
- **Prometheus (metrics):** http://localhost:9090
- **App metrics endpoint:** http://localhost:9464/metrics

## Production Setup (Metrics Disabled)

For production where you might use external monitoring:

```bash
# Disable metrics completely
OTEL_METRICS_ENABLED=false

# Only traces will be collected
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://your-collector:4318/v1/traces
```

## Debugging Setup

For development debugging:

```bash
# Log metrics to console every 10 seconds
OTEL_METRICS_EXPORTER=console
OTEL_METRIC_EXPORT_INTERVAL=10000
```

## Docker Compose Services

The `docker-compose.yml` now includes:

- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Queue backend  
- **Jaeger** (port 16686) - Trace visualization + OTLP collector (ports 4317/4318)
- **Prometheus** (port 9090) - Metrics visualization

You can start only what you need:

```bash
# Just database and traces
docker-compose up postgres redis jaeger

# Everything including metrics dashboard
docker-compose up
```

## Environment Variables Summary

| Variable | Default | Description |
|----------|---------|-------------|
| `PROMETHEUS_PORT` | `9464` | Port for Prometheus metrics |
