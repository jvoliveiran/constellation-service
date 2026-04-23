import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
  ApolloDriver,
  ApolloDriverConfig,
} from '@nestjs/apollo';
import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { PersonModule } from './person/person.module';
import { formatError } from './graphql/formatError';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';
import { otelTransport } from './monitoring/tracer';
import { extendSchema, parse } from 'graphql';
import {
  PublicDirective,
  PrivateDirective,
} from './graphql/directives/access-control.directive';
import { federationDirectiveExtensions } from './graphql/directives/schema-extension';
import { APP_GUARD } from '@nestjs/core';
import { GatewayAuthGuard } from './graphql/guards/gateway-auth.guard';
import { PermissionsGuard } from './graphql/guards/permissions.guard';
import { UserReferenceModule } from './graphql/entities/user-reference.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { validateConfig } from './config/config.validation';
import { configuration } from './config/configuration';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import depthLimit = require('graphql-depth-limit');
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';
import { GraphQLSchema } from 'graphql';

function buildGraphQLModule(): DynamicModule {
  return GraphQLModule.forRootAsync<
    ApolloFederationDriverConfig | ApolloDriverConfig
  >({
    driver:
      process.env.FEDERATION_ENABLED === 'true'
        ? ApolloFederationDriver
        : ApolloDriver,
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => {
      const isDevelopment =
        configService.get<string>('app.nodeEnv') !== 'production';
      const federationEnabled = configService.get<boolean>(
        'app.federationEnabled',
        false,
      );

      return {
        autoSchemaFile: {
          ...(federationEnabled ? { federation: 2 } : {}),
          path: join(process.cwd(), 'src/schema.gql'),
        },
        playground: false,
        sortSchema: true,
        introspection: isDevelopment,
        plugins: [
          ...(isDevelopment
            ? [ApolloServerPluginLandingPageLocalDefault()]
            : []),
          {
            requestDidStart: async () => ({
              async didResolveOperation({ request, document, schema }) {
                const isIntrospection = document.definitions.some(
                  (def) =>
                    def.kind === 'OperationDefinition' &&
                    def.selectionSet.selections.some(
                      (sel) =>
                        sel.kind === 'Field' &&
                        (sel.name.value === '__schema' ||
                          sel.name.value === '__type'),
                    ),
                );
                if (isIntrospection) {
                  return;
                }

                const complexity = getComplexity({
                  schema: schema as GraphQLSchema,
                  operationName: request.operationName ?? undefined,
                  query: document,
                  variables: request.variables ?? {},
                  estimators: [
                    fieldExtensionsEstimator(),
                    simpleEstimator({ defaultComplexity: 1 }),
                  ],
                });

                const MAX_COMPLEXITY = 100;
                if (complexity > MAX_COMPLEXITY) {
                  throw new Error(
                    `Query too complex: ${complexity}. Maximum allowed: ${MAX_COMPLEXITY}.`,
                  );
                }
              },
            }),
          },
        ],
        formatError,
        validationRules: [depthLimit(10, { ignore: [/^__/] })],
        buildSchemaOptions: {
          directives: [PublicDirective, PrivateDirective],
        },
        ...(federationEnabled
          ? {
              transformSchema: (schema: GraphQLSchema) => {
                return extendSchema(
                  schema,
                  parse(federationDirectiveExtensions),
                );
              },
            }
          : {}),
      };
    },
    inject: [ConfigService],
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
    }),
    buildGraphQLModule(),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        level: configService.get<string>('app.logLevel', 'debug'),
        transports: [
          new winston.transports.Console({
            debugStdout: true,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonModuleUtilities.format.nestLike(
                configService.get<string>(
                  'otel.serviceName',
                  'constellation-service',
                ),
                {
                  colors: true,
                  prettyPrint: true,
                },
              ),
            ),
          }),
          otelTransport,
        ],
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    CacheModule,
    AuthModule,
    AuditModule,
    EmailModule,
    HealthModule,
    PrismaModule,
    PersonModule,
    ...(process.env.FEDERATION_ENABLED === 'true' ? [UserReferenceModule] : []),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GatewayAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
