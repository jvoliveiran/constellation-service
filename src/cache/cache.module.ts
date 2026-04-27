import { Global, Module } from '@nestjs/common';
import {
  CacheModule as NestCacheModule,
  CacheModuleAsyncOptions,
} from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { CacheService } from './cache.service';

const cacheModuleOptions: CacheModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    const isTest = configService.get('app.nodeEnv') === 'test';

    if (isTest) {
      return { ttl: 0 };
    }

    const redisHost = configService.get<string>('redis.host');
    const redisPort = configService.get<number>('redis.port');
    const redisPassword = configService.get<string>('redis.password');

    const redisUrl = redisPassword
      ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
      : `redis://${redisHost}:${redisPort}`;

    const defaultTtlSeconds =
      configService.get<number>('cache.defaultTtlSeconds') ?? 60;

    const adapter = new KeyvRedis({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy(retries: number) {
          return Math.min(2 ** retries * 100, 2000);
        },
      },
    });

    const EAGER_CONNECT_TIMEOUT_MS = 5000;
    try {
      await Promise.race([
        adapter.getClient(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Cache Redis connect timeout')),
            EAGER_CONNECT_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch {
      // Connection failed or timed out — cache will connect in the background
    }

    const keyv = new Keyv(adapter, { useKeyPrefix: false });
    keyv.namespace = undefined;

    return {
      stores: [keyv],
      ttl: defaultTtlSeconds * 1000,
    };
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [NestCacheModule.registerAsync(cacheModuleOptions)],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
