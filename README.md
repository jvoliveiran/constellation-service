<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Running the app with Docker

```bash
# Create docker image
$ docker build -t constellation-service .

# Run a container with image created
$ docker run -p 3000:3000 constellation-service
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Prisma

To show all prisma commands:

```bash
$ npx prisma
```

When a new change is added to `schema.prisma` then a new migrate must be created with the following command:

```bash
$ npm run prisma:migrate some-migration-name
```

Command above will also generate a new version of prisma client, reflecting changes on the schema and database.

For development purposes, following command will wipe out the database connected to this service

```bash
$ npm run prisma:reset
```

### Other prisma commands

Loads prisma studion on http://localhost:5555
```bash
$ npm run prisma:ui
```

Upgrade prisma client based on prisma schema. Run lines 2 and 3 in case prisma client is not up to date after running first script.
```bash
$ npm run prisma:generate
$ npm i --save-dev prisma@latest
$ npm i @prisma/client@latest      
```

## Monitor and Healthcheck

We use @nestjs/terminus in order to provide a health check endpoint that execute following actions:
- Trigger a http request to google;
- Check if connection database with Prisma is up;

This endpoint is accessible through route: `/health`

## Logging

Wiston logger replaces NestJS original logger implementation

```typescript
// Injecting loggers via constructor
@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger

// Logging message, which has type any
this.logger.log('Some log message')
```

Docs: https://www.npmjs.com/package/nest-winston

## Message Queues

Register new topics at modules level, adding the following:
```typescript
 imports: [BullModule.registerQueue({ name: 'topic-name' })],
```

Then, new messages can be produced as part of existing services, like so:
```typescript
  constructor(
    @InjectQueue('topic-name')
    private readonly producer: Queue
  )
  ...
  someFunction() {
    ...
    const job = await producer.add('message-key', { foo: 'bar' });
    ...
  }
```

Consumer for messages published usually goes in a dedicated file per topic:
```typescript
@Processor('topic-name')
export class ExampleConsumer {
  constructor() {}

  @Process('message-key')
  async responder(job: Job<unknown>) {
    const data = job.data;
    ...
    return {}; //or data, or anything
  }
}
```

Docs: https://docs.nestjs.com/techniques/queues#queues
