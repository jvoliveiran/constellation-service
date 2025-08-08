## Constellation Service – Architecture Assessment

### Executive summary
- **Service type**: NestJS GraphQL subgraph (Apollo Federation v2) with Prisma (PostgreSQL), Bull (Redis), health checks, and Winston logging.
- **Overall**: Clean baseline with federation v2, typed GraphQL schema generation, e2e tests, Prisma integration, and job queue wiring. Missing critical production features: security hardening, authn/z, observability (metrics/tracing), GraphQL complexity/depth limits, config validation, structured JSON logs with request correlation, and CI/CD.
- **Priority actions (P0)**:
  - Add authn (JWT/OIDC) and field-level authz, propagate identity via GraphQL context and federation headers.
  - Add GraphQL query complexity/depth limiting and rate limiting.
  - Add OpenTelemetry tracing + Prometheus metrics; instrument GraphQL, Prisma, Bull, HTTP; add log correlation IDs.
  - Add configuration validation with Joi/zod; environment-based GraphQL settings (disable introspection/landing in prod).
  - Fix Docker image layering; run as non-root; healthcheck; slimmer runtime.
  - Strengthen testing: isolated test database and data reset; add unit tests; enable coverage thresholds.

---

### Architecture overview (from code)
- GraphQL Federation v2 using Nest Apollo Federation driver
  - Configuration: `GraphQLModule.forRoot` with `ApolloFederationDriver` and `autoSchemaFile: { federation: 2 }`
  - SDL generated at `src/schema.gql` (committed)
  - Custom error formatter in `src/graphql/formatError.ts`
- Domain: `Person` entity
  - SDL via decorators in `src/person/person.types.ts` with `@key(fields: "id")`
  - Resolver implements `@ResolveReference` for entity lookup
  - Service uses Prisma for DB access; Bull queue on create
- Infrastructure
  - Prisma: `src/prisma/prisma.service.ts` connects on module init
  - Bull/Redis: configured via `BullModule.forRootAsync`
  - Health: `/health` endpoint checks Google and Prisma connectivity
  - Logging: `nest-winston` console transport at `debug`
- Bootstrap
  - Global `ValidationPipe`; no helmet/cors/rate-limiter/compression
  - Logger set to Winston provider

Key references:
```1:75:src/app.module.ts
import { ApolloFederationDriver } from '@nestjs/apollo';
... // GraphQL federation v2, Winston, Bull, Health, Prisma
```
```1:48:src/person/person.resolver.ts
@Resolver('Person')
export class PersonResolver {
  @Query(() => [Person]) getAll() { ... }
  @Query(() => Person) getOne(@Args('id') id: number) { ... }
  @Mutation(() => Person) createPerson(@Args('person') person) { ... }
  @ResolveReference() resolveReference(reference) { ... }
}
```
```1:15:src/person/person.types.ts
@ObjectType('Person')
@Directive('@key(fields: "id")')
export class Person { id: number; name: string; age: number }
```
```1:23:src/graphql/formatError.ts
export const formatError = (err) => ({ message: `${error} (${statusCode}): ${message[0]}`, extensions })
```
```1:20:src/main.ts
const app = await NestFactory.create(AppModule)
app.useGlobalPipes(new ValidationPipe({ disableErrorMessages: false }))
await app.listen(port || 3000)
```
```1:20:prisma/schema.prisma
model Person { id Int @id @default(autoincrement()) name String age Int }
```

---

### Strengths
- **Federation v2 ready**: Subgraph with `@key` and `resolveReference` implemented.
- **Type-safe schema**: Code-first schema generation and DTO validation with `class-validator`.
- **Data layer**: Prisma integration with clean service boundaries.
- **Background processing**: Bull queue wired with consumer; decoupled side-effects on create.
- **Health**: Basic `/health` liveness-like check (HTTP + DB).
- **Testing**: e2e tests verifying happy-path and validation failures for GraphQL.
- **Logging**: Winston integration replacing Nest default.

---

### Gaps and risks
- **Security**
  - No authentication or authorization (no guards, directives, or context identity).
  - No CORS configuration, no HTTP security headers (`helmet`), no rate limiting.
  - GraphQL introspection and landing page enabled in all environments; should be off in prod.
  - No request size limits or depth/complexity constraints (risk of DoS/expensive queries).
- **Observability**
  - No tracing (OpenTelemetry) or metrics (Prometheus); limited production visibility.
  - Logs are console-friendly, not JSON-structured by default, and lack correlation IDs/trace IDs.
- **Reliability/resilience**
  - Bull queue lacks retry/backoff/dead-letter settings; no consumer error handling strategy.
  - Prisma service doesn’t hook app shutdown for graceful DB disconnect.
  - No readiness endpoint distinct from liveness; health pings external Google (fragile in restricted environments).
- **Performance**
  - No DataLoader/batching; no response or entity caching (Redis) for read-heavy fields.
  - No GQL persisted queries or compression; no HTTP keep-alive tuning.
- **Configuration hygiene**
  - `ConfigModule` has no schema validation; potential runtime misconfig.
  - GraphQL/static settings not driven by environment (introspection/landing page always on).
- **Testing**
  - e2e tests use whatever `.env` provides; not isolated to a separate test DB; no automatic DB reset.
  - Lack of unit tests for services/resolvers; coverage thresholds not enforced.
- **Containerization**
  - Multi-stage Dockerfile installs prod deps, then copies build stage `node_modules` (likely reintroducing dev deps and bloating image).
  - Runs as root; no healthcheck; fixed `EXPOSE 3000` (not aligned with `SERVICE_PORT`).
- **Federation ergonomics**
  - No auth propagation strategy (e.g., headers/context) across subgraphs.
  - No schema governance: no conventions for `@requires`, `@provides`, `@external`, deprecation policy, or versioning strategy.
- **DevEx/CI**
  - No CI/CD workflows; no lint/test/build gates; no automated image build/push; no vulnerability scanning or dependency updates.

---

### Recommendations (prioritized)

#### P0 – Must-have for production
- **Security**
  - Add JWT/OIDC auth with a Nest guard; populate GraphQL context with user claims.
  - Introduce field-level auth using custom decorators/directives or resolver guards.
  - Configure `helmet`, CORS allowlist, request size limits, and Nest `@nestjs/throttler` rate limiting.
  - Disable GraphQL introspection and landing page in production; enable only in dev.
  - Add GraphQL depth and complexity limits (e.g., `graphql-query-complexity`).
- **Observability**
  - Integrate OpenTelemetry (Nest + Apollo + Prisma + Bull) for distributed tracing.
  - Add Prometheus metrics via `@willsoto/nestjs-prometheus` or similar; expose `/metrics`.
  - Standardize JSON logs; inject request/trace IDs and include them in all log lines.
- **Configuration**
  - Validate env with Joi/zod; fail fast on boot when config is invalid.
  - Centralize environment-driven toggles (introspection, log level, health details).
- **Runtime resilience**
  - Add Nest `enableShutdownHooks`; ensure Prisma `$disconnect` on shutdown.
  - Configure Bull queue: attempts, backoff, dead-letter queue, job retention, concurrency.
- **Testing**
  - Use a dedicated test DB URL; run migrations before tests; truncate/reset data between tests.
  - Add unit tests for `PersonService` and resolver; set coverage thresholds (e.g., 80%).
- **Containerization**
  - Fix multi-stage image: only prod deps in final stage, avoid copying build node_modules; run as non-root; add HEALTHCHECK; slim base image.
- **CI pipeline**
  - Add GitHub Actions (or equivalent) with: lint, type-check, unit + e2e tests, coverage gate, build Docker image, scan (Snyk/Trivy), push to registry.

#### P1 – Important enhancements
- **Performance & caching**
  - Introduce DataLoader for common entity lookups to avoid N+1.
  - Add read-through caching for hot queries (Redis) with TTL and invalidation strategy.
  - Enable gzip/br compression and HTTP keep-alive; consider APQ/persisted queries.
- **GraphQL & Federation**
  - Define conventions for shared fields and ownership; document `@external`, `@provides`, `@requires` usage.
  - Add deprecation policy and changelog for schema changes; consider composition checks in CI.
- **Health & readiness**
  - Split `/health` into `/health/liveness` (cheap) and `/health/readiness` (DB, Redis, upstreams).
  - Avoid external dependencies like Google in health checks; ping internal endpoints or skip external checks in prod.
- **Logging**
  - Add error formatting that preserves `extensions.code`/`path` while avoiding sensitive details.
  - Centralize logger utility with consistent fields (service, env, traceId, userId).

#### P2 – Nice-to-haves
- **DevEx**
  - Add local `docker-compose` for the app + dependencies; add `make` targets or npm scripts for common flows.
  - Introduce Renovate/Dependabot for dependency updates.
- **Security & compliance**
  - Add vulnerability scanning in CI; SBOM generation (Syft) and image signing (Cosign).
  - Secrets management integration (Vault/SM/Parameter Store) instead of plain `.env` in prod.
- **Runtime**
  - Add request-id middleware; expose build/version info endpoint; feature flags.

---

### Concrete suggestions with code anchors
- Disable introspection and landing page in prod
  - Drive via env, e.g., `NODE_ENV !== 'production'` for `introspection` and `plugins` in `GraphQLModule.forRoot`.
```1:75:src/app.module.ts
GraphQLModule.forRoot<ApolloFederationDriverConfig>({
  driver: ApolloFederationDriver,
  autoSchemaFile: { federation: 2, path: join(process.cwd(), 'src/schema.gql') },
  playground: false,
  sortSchema: true,
  introspection: true, // set based on env
  plugins: [ApolloServerPluginLandingPageLocalDefault()], // set based on env
  formatError,
})
```
- Harden bootstrap with security middleware and graceful shutdown
```1:20:src/main.ts
const app = await NestFactory.create(AppModule)
app.useGlobalPipes(new ValidationPipe({ disableErrorMessages: false })) // set true in prod
// app.enableCors({ origin: [...] })
// app.use(helmet())
// app.use(compression())
// await app.listen(port || 3000)
```
- Prisma graceful shutdown
```1:9:src/prisma/prisma.service.ts
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect() }
  // app.enableShutdownHooks(...) + onModuleDestroy -> await this.$disconnect()
}
```
- Bull queue reliability
```1:13:src/person/person.module.ts
BullModule.registerQueue({ name: 'person' /* add defaultJobOptions: { attempts, backoff } */ })
```
- Error formatting policy
```1:23:src/graphql/formatError.ts
// ensure no sensitive data leaks; include error codes; keep extensions minimal in prod
```

---

### Testing strategy
- e2e tests exist and validate core flows. Improve by:
  - Separate `.env.test` with a unique test DB; run migrations during setup; truncate tables between tests.
  - Add unit tests for `PersonService` and resolver logic (including reference resolution, error cases).
  - Add integration tests for Bull consumer behavior and failure handling.
  - Enforce coverage thresholds and report to CI.

---

### CI/CD recommendations
- CI pipeline stages:
  - Install -> Lint -> Type-check -> Unit tests -> e2e tests (with services) -> Coverage gate -> Build Docker -> Scan -> Push.
  - Run composition checks for subgraph SDL against supergraph (if available) and schema linting.
- CD:
  - Blue/green or canary deploys; health/readiness gates; automated rollback.

---

### Container & runtime hardening
- Dockerfile improvements:
  - Use `node:20-alpine` or `-slim`; `npm ci --omit=dev` in final stage.
  - Do not copy `node_modules` from build stage into final stage.
  - Add `HEALTHCHECK`; switch to non-root `node` user; use `tini` for signal handling.
  - Parameterize port to honor `SERVICE_PORT`.
- K8s (if applicable):
  - Liveness and readiness probes; resource requests/limits; PodDisruptionBudget; HPA on CPU/RPS.

---

### Federation-specific guidance
- Authorization: propagate identity from gateway, standardize auth headers and context across subgraphs.
- Schema governance: define rules for entity ownership, composition constraints, deprecation lifecycle, and breaking change checks in CI.
- Contract testing: add composition tests against the supergraph in CI; publish subgraph SDL on build.

---

### Backlog checklist
- [ ] Add authn (JWT/OIDC) and field-level authz
- [ ] Env-based GraphQL config; disable introspection/landing in prod
- [ ] Helmet, CORS allowlist, throttling, body size limits
- [ ] GraphQL depth/complexity limits; rate-limiting
- [ ] OpenTelemetry tracing; Prisma/Bull instrumentation
- [ ] Prometheus metrics endpoint
- [ ] JSON logs with request and trace correlation
- [ ] Config validation with Joi/zod
- [ ] Prisma graceful shutdown
- [ ] Bull retry/backoff/DLQ settings; consumer error handling
- [ ] DataLoader and caching for reads
- [ ] Unit tests + improved e2e with isolated test DB and reset
- [ ] CI pipeline (lint/test/build/scan/publish) and composition checks
- [ ] Dockerfile hardening; non-root; healthcheck; smaller image
- [ ] Health split: liveness vs readiness; internal checks only
- [ ] Schema governance and deprecation policy 