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

TBD
https://docs.nestjs.com/recipes/terminus

## Logging

TBD
https://www.npmjs.com/package/nest-winston

## Message Queues

TBD
https://docs.nestjs.com/techniques/queues#queues
