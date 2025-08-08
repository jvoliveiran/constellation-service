<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Constellation Service

NestJS GraphQL subgraph for an Apollo Federation v2 architecture. Provides a `Person` entity and supporting APIs, with Prisma (PostgreSQL), Bull (Redis) for background jobs, health checks, and structured logging via Winston.

### Stack
- **Runtime**: Node.js 20 (see `.nvmrc`)
- **Framework**: NestJS 10
- **GraphQL**: Apollo Federation v2 (`@nestjs/apollo`, `@nestjs/graphql`)
- **DB/ORM**: PostgreSQL + Prisma
- **Queues**: Bull + Redis
- **Logging**: `nest-winston`
- **Health**: `@nestjs/terminus`

## Getting started

### Prerequisites
- Node 20 (recommended: `nvm use`)
- Docker (optional, for Postgres/Redis via `docker-compose`)

### Install
```bash
npm install
```

### Environment
Create a `.env` in the project root. Example:
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
REDIS_PASSWORD=
```

### Development
```bash
# Start Postgres and Redis locally (uses docker-compose and your .env)
npm run dev:up

# Run the service in watch mode
npm run dev

# Stop Postgres and Redis containers
npm run dev:down
```
Service runs on `http://localhost:${SERVICE_PORT || 3000}`.

### GraphQL
- Endpoint: `/graphql`
- Federation: enabled (v2). Entities use `@key` directive. See generated SDL at `src/schema.gql`.
- Introspection and Apollo landing page are enabled in development.

Example operations:
```graphql
# Query all people
query {
  getAll { id name age }
}

# Query one person
query {
  getOne(id: 1) { id name age }
}

# Create a person
mutation {
  createPerson(person: { name: "Ada", age: 36 }) {
    id
    name
    age
  }
}
```

### Federation notes
- Subgraph is configured with `ApolloFederationDriver` and `autoSchemaFile` set to federation 2.
- Entity example: `Person` is annotated with `@key(fields: "id")`. Reference resolution is implemented via `resolveReference` in `PersonResolver`.
- Gateways (e.g., Apollo Router) can fetch SDL from `/graphql` for composition.

## Prisma
- Prisma schema: `prisma/schema.prisma`
- DB URL: `DATABASE_URL` from `.env`

Common workflows:
```bash
# Create a new migration and update client
echo "your-migration-name" | xargs npm run prisma:migration

# Reset database and re-apply migrations (DANGEROUS)
npm run prisma:reset

# Open Prisma Studio
npm run prisma:ui

# Regenerate Prisma Client (if needed)
npx prisma generate
```

## Queues (Bull)
- Redis connection is configured via `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
- The `person` queue is registered in `PersonModule`.
- On `createPerson`, a `create-person` job is enqueued; `PersonConsumer` handles it.

Register a queue in a module:
```ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [BullModule.registerQueue({ name: 'topic-name' })],
})
export class SomeModule {}
```

Produce a message from a service:
```ts
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

constructor(@InjectQueue('topic-name') private readonly producer: Queue) {}

async someFunction() {
  await this.producer.add('message-key', { foo: 'bar' });
}
```

Consume messages:
```ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('topic-name')
export class ExampleConsumer {
  @Process('message-key')
  async responder(job: Job<unknown>) {
    return job.data;
  }
}
```

Example in this service:
```ts
// Producer (in PersonService)
await this.personQueue.add('create-person', person);

// Consumer (in PersonConsumer)
@Process('create-person')
async personCreatedResponder(job: Job<unknown>) {
  return job.data;
}
```

See also: [NestJS Queues docs](https://docs.nestjs.com/techniques/queues#queues)

## Health check
- `GET /health` runs:
  - HTTP ping to `https://google.com`
  - Prisma DB connectivity check

## Logging
Winston replaces the default Nest logger. Inject and use:
```ts
// Inject in your class
@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger;

// Usage
this.logger.log('Some log message');
```
Log level is set to `debug` by default. See `WinstonModule.forRoot` in `src/app.module.ts`.

## Testing
```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov
```

## Docker
### Build and run the service image
```bash
# Build (note lowercase dockerfile name)
docker build -f dockerfile -t constellation-service .

# Run with your .env
docker run --env-file .env -p 3000:3000 constellation-service
```

### Local infra (recommended for dev)
Use `docker-compose` to spin up Postgres and Redis (ports and creds read from `.env`):
```bash
npm run dev:up
# ... work on the app
npm run dev:down
```

## Project structure (high-level)
- `src/app.module.ts`: App wiring (GraphQL federation, Prisma, Bull, health, logging)
- `src/person/*`: `Person` entity, resolver, service, queue consumer
- `src/graphql/*`: GraphQL helpers (error formatting, types)
- `src/prisma/*`: Prisma module/service
- `src/health/*`: Health endpoints
- `prisma/schema.prisma`: Prisma schema

## Notes
- Generated SDL: `src/schema.gql` (do not edit directly)
- Node version: defined in `.nvmrc`
- Default service port: `SERVICE_PORT` (falls back to 3000)
