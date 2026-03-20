import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { BullModule } from '@nestjs/bull';
import { join } from 'path';
import { otelTransport } from './monitoring/tracer';
import { extendSchema, parse } from 'graphql';
import {
  PublicDirective,
  PrivateDirective,
} from './graphql/directives/access-control.directive';
import { federationDirectiveExtensions } from './graphql/directives/schema-extension';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './graphql/guards/jwt-auth.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModuleOptions } from '@nestjs/jwt';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { validateConfig } from './config/config.validation';
import { configuration } from './config/configuration';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import depthLimit = require('graphql-depth-limit');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
    }),
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isDevelopment =
          configService.get<string>('app.nodeEnv') !== 'production';

        return {
          autoSchemaFile: {
            federation: 2,
            path: join(process.cwd(), 'src/schema.gql'),
          },
          playground: false,
          sortSchema: true,
          introspection: isDevelopment,
          plugins: isDevelopment
            ? [ApolloServerPluginLandingPageLocalDefault()]
            : [],
          formatError,
          validationRules: [depthLimit(10)],
          buildSchemaOptions: {
            directives: [PublicDirective, PrivateDirective],
          },
          transformSchema: (schema) => {
            return extendSchema(schema, parse(federationDirectiveExtensions));
          },
        };
      },
      inject: [ConfigService],
    }),
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
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get(
            'jwt.expiresIn',
            '1h',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    HealthModule,
    PrismaModule,
    PersonModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
