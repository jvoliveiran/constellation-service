import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import Redis from 'ioredis';

const REVOKED_JTI_PREFIX = 'revoked-jti:';

@Injectable()
export class TokenRevocationService {
  private readonly redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
    });
  }

  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    const key = `${REVOKED_JTI_PREFIX}${jti}`;
    await this.redis.set(key, '1', 'EX', ttlSeconds);
    this.logger.log('Token revoked', {
      jti,
      ttlSeconds,
      context: TokenRevocationService.name,
    });
  }

  async isRevoked(jti: string): Promise<boolean> {
    try {
      const key = `${REVOKED_JTI_PREFIX}${jti}`;
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error: unknown) {
      this.logger.warn(
        'Redis unavailable for revocation check — failing open',
        {
          jti,
          error: error instanceof Error ? error.message : String(error),
          context: TokenRevocationService.name,
        },
      );
      return false;
    }
  }
}
