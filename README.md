<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Constellation Service

NestJS GraphQL subgraph for an Apollo Federation v2 architecture. Provides a `Person` entity and supporting APIs, with Prisma (PostgreSQL), Bull (Redis) for background jobs, JWT authentication, cursor-based pagination, query complexity protection, health checks, structured logging via Winston, and full observability through OpenTelemetry (traces, metrics, logs). Infrastructure is managed with Terraform on AWS ECS Fargate.

### Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Runtime** | Node.js | 20 (see `.nvmrc`) |
| **Framework** | NestJS | 10 |
| **Language** | TypeScript | 5.1 (ES2021 target) |
| **GraphQL** | Apollo Federation v2 | `@nestjs/apollo` 12, `@apollo/subgraph` 2.6 |
| **Database** | PostgreSQL + Prisma | Prisma 5.12 |
| **Queues** | Bull + Redis | Bull 4.12, Redis 7.2 |
| **Authentication** | JWT | `@nestjs/jwt` 11 |
| **Health** | `@nestjs/terminus` | 10.2 |
| **Logging** | Winston + OpenTelemetry | `nest-winston` 1.9, `winston` 3.13 |
| **Observability** | OpenTelemetry (OTLP) | Traces, metrics, and logs |
| **Monitoring** | Jaeger + Prometheus | Local dev via Docker Compose |
| **Infrastructure** | Terraform + AWS | ECS Fargate, RDS, ALB, ECR |
| **Linting** | ESLint + Prettier | ESLint 8.42, Prettier 3.0 |
| **Rate Limiting** | `@nestjs/throttler` | 6.5 |
| **Query Protection** | `graphql-query-complexity` | 1.1 |
| **Testing** | Jest + Supertest | Jest 29.5 |

## Getting started

### Prerequisites
- Node 20 (recommended: `nvm use`)
- Docker and Docker Compose (for Postgres, Redis, Jaeger, and Prometheus)

### Install
```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and adjust values as needed:

```env
# Service
SERVICE_PORT=3000

# Database (used by prisma/schema.prisma via DATABASE_URL)
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=constellation
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_URL=postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}?schema=public

# Redis (Bull)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-change-in-production

# CORS (required in production; comma-separated origins)
FRONTEND_ORIGINS=http://localhost:3001

# OpenTelemetry
OTEL_SERVICE_NAME=constellation-service
OTEL_SERVICE_NAMESPACE=constellation
OTEL_SERVICE_VERSION=1.0.0
DEPLOYMENT_ENVIRONMENT=development
```

See the [Environment variables](#environment-variables) section for a full reference.

### Development

```bash
# Start Postgres, Redis, Jaeger, and Prometheus (docker-compose)
npm run dev:up

# Run Prisma migrations
npx prisma migrate dev

# Run the service in watch mode
npm run dev

# Stop all containers
npm run dev:down
```

Service runs on `http://localhost:${SERVICE_PORT || 3000}`.

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile the project with `nest build` |
| `npm run dev` | Start in watch mode (`nest start --watch`) |
| `npm run dev:up` | Start Docker Compose infrastructure |
| `npm run dev:down` | Stop Docker Compose infrastructure |
| `npm start` | Start the service |
| `npm run start:prod` | Start from compiled `dist/main` |
| `npm run start:debug` | Start in debug + watch mode |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npm run format` | Format source with Prettier |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:cov` | Run tests with coverage report |
| `npm run test:debug` | Run tests in debug mode |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run prisma:migration` | Create a new Prisma migration |
| `npm run prisma:reset` | Reset database and re-apply migrations |
| `npm run prisma:ui` | Open Prisma Studio |

## GraphQL

### Endpoint and tooling
- **Endpoint**: `/graphql`
- **Introspection**: enabled
- **Apollo Landing Page**: enabled in development
- **Generated SDL**: `src/schema.gql` (auto-generated, do not edit directly)

### Federation

The service is an Apollo Federation v2 subgraph, configured with `ApolloFederationDriver` and `autoSchemaFile` for automatic SDL generation.

**Federation schema extensions:**
```graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.3",
        import: ["@key", "@shareable", "@composeDirective"])
  @link(url: "https://myspecs.dev/accessControl/v1.0",
        import: ["@public", "@private"])
  @composeDirective(name: "@public")
  @composeDirective(name: "@private")
```

The `Person` entity is annotated with `@key(fields: "id")` and implements `resolveReference` in `PersonResolver` for cross-subgraph entity resolution. Gateways (e.g., Apollo Router) can fetch the SDL from `/graphql` for composition.

### Custom directives

| Directive | Locations | Purpose |
|-----------|-----------|---------|
| `@public` | `FIELD_DEFINITION`, `OBJECT` | Marks fields/types as publicly accessible without authentication |
| `@private` | `FIELD_DEFINITION`, `OBJECT` | Marks fields/types as requiring authentication (default behavior) |

These are custom `@composeDirective`s exposed to the federation gateway for access control composition.

### Operations

| Operation | Type | Auth | Input | Output |
|-----------|------|------|-------|--------|
| `getAll` | Query | Public (`@public`) | `CursorPaginationArgs` (optional) | `CursorPaginatedPersonResponse` |
| `getOne` | Query | JWT required | `id: Int!` | `Person!` |
| `createPerson` | Mutation | JWT required | `CreatePersonInput!` | `Person!` |

**Example queries:**
```graphql
# Query all people with cursor pagination (public, no auth required)
query {
  getAll(first: 10) {
    items { id name age createdAt }
    hasMore
    endCursor
    total
  }
}

# Paginate to the next page using the cursor
query {
  getAll(first: 10, after: "<endCursor from previous response>") {
    items { id name age createdAt }
    hasMore
    endCursor
  }
}

# Query one person (requires Authorization header with JWT)
query {
  getOne(id: 1) { id name age }
}

# Create a person (requires Authorization header with JWT)
mutation {
  createPerson(person: { name: "Ada", age: 36 }) {
    id
    name
    age
  }
}
```

### Pagination

All list queries use **cursor-based pagination** (not offset-based). This provides stable ordering under concurrent writes and efficient traversal of large datasets.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `first` | `Int` | `20` | Number of items to return (1-100) |
| `after` | `String` | `null` | Opaque cursor from a previous `endCursor` |

**Response shape:**

| Field | Type | Description |
|-------|------|-------------|
| `items` | `[T!]!` | The list of items for the current page |
| `hasMore` | `Boolean!` | Whether there are more items after this page |
| `endCursor` | `String` | Opaque cursor for the last item (pass as `after` for next page) |
| `total` | `Int` | Total count of items matching the query |

The `CursorPaginated<T>` factory in `src/common/dto/cursor-paginated-response.factory.ts` generates paginated response types for any entity.

### Query protection

GraphQL queries are protected against abuse:

| Protection | Limit | Description |
|------------|-------|-------------|
| **Depth limit** | 10 | Maximum nesting depth for queries |
| **Complexity limit** | 100 | Maximum query complexity score (each field = 1 point) |
| **Rate limiting** | 100 req/60s | Global rate limit via `@nestjs/throttler` |

### Input validation

`CreatePersonInput` uses `class-validator` decorators:
- `name`: must not be empty
- `age`: must not be empty, minimum value of 1

Validation is enforced globally via `ValidationPipe` in `main.ts`.

## Authentication

JWT-based authentication is applied globally via `JwtAuthGuard` (registered as `APP_GUARD`). All resolvers require a valid JWT token by default.

To make a resolver or query publicly accessible, use the `@Public()` decorator:
```ts
@Public()
@Query(() => [Person])
getAll() { ... }
```

**Configuration:**
- Secret: `JWT_SECRET` environment variable
- Token expiry: 1 hour
- Header: `Authorization: Bearer <token>`

**Available decorators:**

| Decorator | Location | Purpose |
|-----------|----------|---------|
| `@Public()` | Resolver/Query | Bypasses JWT authentication |
| `@CurrentUser()` | Resolver parameter | Injects the decoded JWT payload |
| `@RequestMeta()` | Resolver parameter | Injects correlation ID, IP address, and user agent |

## Prisma

### Schema

Located at `prisma/schema.prisma`. Uses PostgreSQL with the `tracing` preview feature enabled for OpenTelemetry integration.

**Current model:**
```prisma
model Person {
  id        Int      @id @default(autoincrement())
  name      String
  age       Int
  createdAt DateTime @default(now()) @map("created_at")

  @@index([createdAt(sort: Desc), id(sort: Desc)])
}
```

### Repository pattern

Data access is encapsulated in repository classes. Services never import `PrismaService` directly — they depend on their feature repository.

```
PersonResolver → PersonService → PersonRepository → PrismaService
```

### Prisma error codes

Named constants for common Prisma errors are available in `src/prisma/prisma-error-codes.ts`:

| Constant | Code | Meaning |
|----------|------|---------|
| `PRISMA_UNIQUE_CONSTRAINT_VIOLATION` | `P2002` | Unique constraint failed |
| `PRISMA_RECORD_NOT_FOUND` | `P2025` | Record not found |

### Database tracing

`PrismaService` extends `PrismaClient` and adds custom middleware that creates OpenTelemetry spans for every database operation. Each span includes:
- `db.operation`: the Prisma action (e.g., `findMany`, `create`)
- `db.collection.name`: the model name
- `db.system`: `postgresql`

Query logging is enabled at all levels in development. In test environment, only errors are logged to reduce noise.

### Common workflows

```bash
# Create a new migration
npm run prisma:migration
# You'll be prompted for a migration name

# Reset database and re-apply all migrations (DESTRUCTIVE)
npm run prisma:reset

# Open Prisma Studio (visual database browser)
npm run prisma:ui

# Regenerate Prisma Client
npx prisma generate
```

## Queues (Bull)

Redis-backed job queues using Bull, configured via `BullModule.forRootAsync` with `ConfigService` for environment-driven Redis connection.

### How it works

1. When `createPerson` is called, `PersonService` persists the record via `PersonRepository` and enqueues a `create-person` job to the `person` queue.
2. `PersonConsumer` (annotated with `@Processor('person')`) picks up the job and processes it.

### Adding a new queue

**Register in a module:**
```ts
@Module({
  imports: [BullModule.registerQueue({ name: 'topic-name' })],
})
export class SomeModule {}
```

**Produce a message:**
```ts
@InjectQueue('topic-name') private readonly producer: Queue

async someFunction() {
  await this.producer.add('message-key', { foo: 'bar' });
}
```

**Consume messages:**
```ts
@Processor('topic-name')
export class ExampleConsumer {
  @Process('message-key')
  async responder(job: Job<unknown>) {
    return job.data;
  }
}
```

See also: [NestJS Queues docs](https://docs.nestjs.com/techniques/queues#queues)

## Health check

`GET /health` performs the following checks using `@nestjs/terminus`:

| Check | Description |
|-------|-------------|
| HTTP Ping | Verifies external connectivity by pinging `https://google.com` |
| Prisma | Verifies database connectivity via `PrismaService` |

## Logging

Winston replaces the default NestJS logger globally. Two transports are configured:

1. **Console transport**: Timestamps, millisecond durations, NestJS-like colored format with pretty printing.
2. **OpenTelemetry transport**: Custom `OpenTelemetryTransport` that forwards logs to the OTLP log exporter with severity mapping (`error` → `ERROR`, `warn` → `WARN`, `info` → `INFO`, `debug` → `DEBUG`, `verbose`/`silly` → `TRACE`).

**Default log level**: `debug`

**Usage:**
```ts
@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger;

this.logger.log('Info message');
this.logger.debug('Debug message');
this.logger.error('Error message');
```

## Observability (OpenTelemetry)

Full observability stack using OpenTelemetry with OTLP exporters for traces, metrics, and logs. Configuration is in `src/monitoring/tracer.ts`.

### Signals

| Signal | Exporter | Local Endpoint | Export Interval |
|--------|----------|----------------|-----------------|
| Traces | `OTLPTraceExporter` | `http://localhost:4318/v1/traces` | On span end |
| Metrics | `OTLPMetricExporter` | `http://localhost:4318/v1/metrics` | Every 60s |
| Logs | `OTLPLogExporter` | `http://localhost:4318/v1/logs` | Batched |

### Auto-instrumentation

Enabled via `@opentelemetry/auto-instrumentations-node` with the following configuration:
- **HTTP instrumentation**: enabled, with ignored paths: `/metrics`, `/traces`, `/logs`, `/api/health`
- **FS instrumentation**: disabled (noisy)
- **Winston instrumentation**: enabled, enriches log records with service metadata
- **Prisma tracing**: enabled via preview feature + custom middleware spans

### Resource attributes

```
service.name = constellation-service
service.namespace = constellation
service.version = 1.0.0
deployment.environment = development | production
telemetry.sdk.name = opentelemetry
telemetry.sdk.language = nodejs
telemetry.sdk.version = 1.28.0
```

### Exporter configuration

All exporters use GZIP compression, 30s timeout, and a concurrency limit of 10. Supports custom endpoints via `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g., Grafana Cloud) or local endpoints via `OTLP_HOST`/`OTLP_PORT`.

### Local monitoring tools

Docker Compose includes:

| Tool | Port | Purpose |
|------|------|---------|
| **Jaeger** | `16686` (UI), `4317` (gRPC), `4318` (HTTP) | Distributed tracing |
| **Prometheus** | `9090` | Metrics collection (config: `prometheus.yml`) |

Access Jaeger UI at `http://localhost:16686` and Prometheus at `http://localhost:9090`.

### Grafana Cloud (free tier)

The OpenTelemetry setup supports Grafana Cloud out of the box via OTLP. All three signals (traces, metrics, logs) are sent to Grafana's managed backends: **Tempo** (traces), **Mimir** (metrics), and **Loki** (logs).

#### 1. Create a Grafana Cloud account

Sign up at [grafana.com](https://grafana.com) and create a free tier stack. The free tier includes:

| Signal | Backend | Free Quota | Retention |
|--------|---------|------------|-----------|
| Traces | Tempo | 50 GB/month | 14 days |
| Metrics | Mimir | 10,000 active series, 50 GB/month | 13 months |
| Logs | Loki | 50 GB/month | 30 days |

#### 2. Get your OTLP credentials

1. In the Grafana Cloud portal, navigate to your stack
2. Go to **Configure** → **OpenTelemetry (OTLP)**
3. Copy the **OTLP endpoint** (e.g., `https://otlp-gateway-prod-sa-east-1.grafana.net/otlp`)
4. Generate an **API token** with `MetricsPublisher`, `LogsPublisher`, and `TracesPublisher` permissions
5. Build the auth token as `Basic base64(instanceId:apiToken)`

#### 3. Configure environment variables

Add the following to your `.env` file:

```env
# Grafana Cloud OTLP
OTLP_ENDPOINT=https://otlp-gateway-prod-<REGION>.grafana.net/otlp
OTLP_AUTH_TOKEN=Basic <base64(instanceId:apiToken)>

# OpenTelemetry resource attributes
OTEL_SERVICE_NAME=constellation-service
OTEL_SERVICE_NAMESPACE=constellation
OTEL_SERVICE_VERSION=1.0.0
DEPLOYMENT_ENVIRONMENT=production
```

The tracer (`src/monitoring/tracer.ts`) reads `OTLP_ENDPOINT` (or `OTEL_EXPORTER_OTLP_ENDPOINT`) to route all signals to Grafana Cloud. When neither is set, it falls back to `http://localhost:4318` for local development with Jaeger.

`OTLP_AUTH_TOKEN` is sent as the `Authorization` header on every OTLP export request.

#### 4. Verify data in Grafana Cloud

Start the service and generate some traffic, then verify each signal:

- **Traces**: Go to **Explore** → select **Tempo** → search by `service.name = constellation-service`
- **Metrics**: Go to **Explore** → select **Mimir** → query `{service_name="constellation-service"}`
- **Logs**: Go to **Explore** → select **Loki** → query `{service_name="constellation-service"}`

#### Free tier considerations

- Keep `LOG_LEVEL=info` in production to stay within log quotas (avoid `debug` or `verbose`)
- The metric reader exports every 60 seconds — this is already conservative for the free tier
- Health check paths (`/health`, `/metrics`, `/traces`, `/logs`) are excluded from tracing to reduce noise
- FS instrumentation is disabled by default to avoid excessive span generation
- All exporters use GZIP compression to minimize bandwidth usage

## Testing

### Unit tests
```bash
npm test                 # Run all unit tests
npm run test:watch       # Watch mode
npm run test:cov         # With coverage report (output: coverage/)
npm run test:debug       # Debug mode (--inspect-brk)
```

Unit tests match `src/**/*.spec.ts`.

### E2E tests
```bash
npm run test:e2e
```

E2E tests match `test/**/*.e2e-spec.ts`. The test setup (`test/setup-e2e.ts`):
- Configures a test database URL via `DATABASE_URL`
- Disables OpenTelemetry (`OTEL_SDK_DISABLED=true`) to prevent segfaults
- Sets a 30-second timeout

**Test infrastructure:**
- `test/factory/create-test-module.ts`: Creates a NestJS testing module with `AppModule`, initializes the app with `ValidationPipe`, and provides `prisma` and `app` instances for test use.
- `test/factory/person.factory.ts`: Helper for creating test `Person` records via Prisma.

**Current unit test coverage:**
- Config validation (15 tests)
- Cursor utils: encode/decode round-trip, error handling (9 tests)
- Email masking utility (5 tests)

**Current E2E test coverage (Person):**
- Query all people with default cursor pagination (public, no auth)
- Query with custom `first` parameter
- Paginate through results using cursor (`after`)
- Query one person by ID (with JWT)
- Return not found for non-existent person
- Reject query without authentication
- Create a person (with JWT)
- Reject creation without authentication
- Reject creation with invalid input (age < 1)

## CORS

CORS is configured in `main.ts` with environment-aware behavior:

- **Development**: all origins are allowed
- **Production**: only origins listed in `FRONTEND_ORIGINS` are allowed (comma-separated). The service throws an error at startup if `FRONTEND_ORIGINS` is empty in production.

Allowed methods: `GET`, `POST`, `OPTIONS`. Credentials are enabled.

## Docker

### Build and run the service image

The Dockerfile uses a multi-stage build:
1. **Build stage**: `node:20` — installs all dependencies and compiles
2. **Production stage**: `node:20-alpine` — copies only production dependencies and compiled output

```bash
# Build
docker build -f dockerfile -t constellation-service .

# Run
docker run --env-file .env -p 3000:3000 constellation-service
```

### Local infrastructure (Docker Compose)

Docker Compose provides the full development stack:

| Service | Image | Port(s) | Purpose |
|---------|-------|---------|---------|
| **PostgreSQL** | `postgres:latest` | `5432` | Primary database |
| **Redis** | `redis:7.2` | `6379` | Bull job queue backend |
| **Jaeger** | `jaegertracing/all-in-one:latest` | `16686`, `4317`, `4318` | Trace collection and UI |
| **Prometheus** | `prom/prometheus:latest` | `9090` | Metrics collection |

```bash
npm run dev:up     # Start all services
npm run dev:down   # Stop all services
```

Data is persisted via Docker volumes (`constellation-optl-data` for Postgres, `redis-optl-data` for Redis).

## Infrastructure (Terraform)

Infrastructure is defined in the `terraform/` directory for deployment on AWS.

### Bootstrap

`terraform/bootstrap/` creates the S3 bucket for Terraform remote state with versioning, encryption (AES256), and public access blocking.

```bash
cd terraform/bootstrap
terraform init && terraform apply
```

### Main infrastructure

`terraform/main.tf` uses a shared `constellation-infra` module to provision:

- **ECS Fargate**: Container orchestration with configurable CPU/memory and Fargate Spot support
- **RDS PostgreSQL**: Managed database (`db.t3.micro` default)
- **ECR**: Container image registry
- **ALB**: Application Load Balancer with HTTPS (ACM + Route53)
- **CloudWatch**: Logging
- **Auto-scaling**: Scheduled scaling support

**Key variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `aws_region` | `us-east-1` | AWS region |
| `db_instance_class` | `db.t3.micro` | RDS instance type |
| `db_allocated_storage` | `5` | Storage in GB |
| `task_cpu` | `512` | CPU units (512 = 0.5 vCPU) |
| `task_memory` | `1024` | Memory in MB |
| `desired_count` | `2` | Number of ECS tasks |
| `enable_fargate_spot` | `true` | Use Fargate Spot instances |
| `fargate_spot_percentage` | `50` | Percentage of tasks on Spot |
| `health_check_path` | `/health` | Health check endpoint |
| `skip_ecs_deployment` | `false` | Skip ECS deployment (for initial bootstrap) |

## Project structure

```
constellation-service/
├── src/
│   ├── main.ts                        # Bootstrap, CORS, validation pipe, Helmet
│   ├── app.module.ts                  # Root module (GraphQL, Prisma, Bull, JWT, Winston, Throttler)
│   ├── schema.gql                     # Auto-generated Federation SDL
│   ├── person/
│   │   ├── person.module.ts           # Person module registration
│   │   ├── person.resolver.ts         # GraphQL resolver (queries, mutations, reference)
│   │   ├── person.service.ts          # Business logic + queue producer
│   │   ├── person.repository.ts       # Prisma data access layer
│   │   ├── person.consumer.ts         # Bull queue consumer
│   │   ├── person.types.ts            # GraphQL ObjectType (federation entity)
│   │   └── person.dto.ts              # Input types with validation
│   ├── common/
│   │   ├── dto/
│   │   │   ├── cursor-pagination.args.ts           # CursorPaginationArgs (first/after)
│   │   │   └── cursor-paginated-response.factory.ts # CursorPaginated<T> generic factory
│   │   ├── types/
│   │   │   └── decoded-cursor.types.ts  # Cursor type definition
│   │   ├── utils/
│   │   │   ├── cursor.utils.ts          # Cursor encode/decode
│   │   │   └── mask-email.ts            # Email masking for logs
│   │   ├── validators/
│   │   │   ├── match.validator.ts       # @Match('field') decorator
│   │   │   └── json-object.validator.ts # @IsJsonObject() validator
│   │   ├── guards/
│   │   │   └── gql-throttler.guard.ts   # GraphQL-aware throttler guard
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts # Global HTTP exception filter
│   │   └── middleware/
│   │       └── correlation-id.middleware.ts # Correlation ID + OTEL span tagging
│   ├── graphql/
│   │   ├── formatError.ts             # Custom GraphQL error formatting
│   │   ├── types.ts                   # GraphQL type helpers
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts    # @Public() decorator for open endpoints
│   │   │   ├── current-user.decorator.ts  # @CurrentUser() JWT payload injection
│   │   │   └── request-meta.decorator.ts  # @RequestMeta() correlation ID, IP, user agent
│   │   ├── directives/
│   │   │   ├── access-control.directive.ts  # @public/@private GraphQL directives
│   │   │   └── schema-extension.ts          # Federation schema extensions
│   │   └── guards/
│   │       └── jwt-auth.guard.ts      # Global JWT auth guard
│   ├── prisma/
│   │   ├── prisma.module.ts           # Global Prisma module
│   │   ├── prisma.service.ts          # PrismaClient + OTEL tracing middleware
│   │   └── prisma-error-codes.ts      # Named Prisma error constants
│   ├── config/
│   │   ├── configuration.ts           # Typed configuration factory
│   │   └── config.validation.ts       # Zod-based env validation
│   ├── health/
│   │   ├── health.module.ts           # Health module
│   │   ├── health.controller.ts       # GET /health endpoint
│   │   └── redis-health.indicator.ts  # Custom Redis health check
│   └── monitoring/
│       ├── tracer.ts                  # OpenTelemetry SDK configuration
│       └── winston.transporter.ts     # Custom Winston → OTLP transport
├── prisma/
│   ├── schema.prisma                  # Database schema
│   ├── seed.ts                        # Database seeding
│   └── migrations/                    # Migration history
├── test/
│   ├── jest-e2e.json                  # E2E test config
│   ├── setup-e2e.ts                   # E2E environment setup
│   ├── person.e2e-spec.ts            # Person E2E tests (9 tests)
│   └── factory/
│       ├── create-test-module.ts      # Test module factory
│       └── person.factory.ts          # Test data factory
├── terraform/
│   ├── main.tf                        # AWS infrastructure
│   ├── variables.tf                   # Terraform variables
│   ├── outputs.tf                     # Terraform outputs
│   └── bootstrap/                     # S3 state bucket setup
├── .github/workflows/ci.yml          # CI pipeline
├── docker-compose.yml                 # Dev infrastructure
├── dockerfile                         # Multi-stage Docker build
├── prometheus.yml                     # Prometheus scrape config
├── constellation.config.json          # Constellation config
├── .eslintrc.js                       # ESLint config
├── .prettierrc                        # Prettier config (single quotes, trailing commas)
├── .nvmrc                             # Node version (20)
├── tsconfig.json                      # TypeScript config
├── tsconfig.build.json                # Build-specific TS config
└── nest-cli.json                      # NestJS CLI config
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERVICE_PORT` | No | `3000` | Port the service listens on |
| `DATABASE_HOST` | No | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | No | `5432` | PostgreSQL port |
| `DATABASE_USER` | No | `postgres` | PostgreSQL user |
| `DATABASE_PASSWORD` | Yes | — | PostgreSQL password |
| `DATABASE_NAME` | Yes | — | Database name |
| `DATABASE_URL` | Yes | — | Full Prisma connection string |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Redis password |
| `JWT_SECRET` | Yes | `your-secret-key-change-in-production` | JWT signing secret |
| `FRONTEND_ORIGINS` | Prod only | — | Comma-separated CORS origins |
| `NODE_ENV` | No | — | Environment (`production`, `development`) |
| `OTEL_SERVICE_NAME` | No | `constellation-service` | OpenTelemetry service name |
| `OTEL_SERVICE_NAMESPACE` | No | `constellation` | OpenTelemetry namespace |
| `OTEL_SERVICE_VERSION` | No | `1.0.0` | OpenTelemetry service version |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | `http://localhost:4318` | OTLP exporter endpoint (alternative to `OTLP_ENDPOINT`) |
| `OTLP_ENDPOINT` | No | — | OTLP gateway URL (e.g., Grafana Cloud `https://otlp-gateway-prod-<region>.grafana.net/otlp`) |
| `OTLP_AUTH_TOKEN` | No | — | OTLP `Authorization` header value (e.g., `Basic base64(instanceId:apiToken)` for Grafana Cloud) |
| `OTLP_HOST` | No | `localhost` | Local OTLP collector host (used when `OTLP_ENDPOINT` is not set) |
| `OTLP_PORT` | No | `4318` | Local OTLP collector port (used when `OTLP_ENDPOINT` is not set) |
| `DEPLOYMENT_ENVIRONMENT` | No | `development` | Deployment environment label |
