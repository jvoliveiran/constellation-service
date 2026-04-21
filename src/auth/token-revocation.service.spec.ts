import { ConfigService } from '@nestjs/config';
import { TokenRevocationService } from './token-revocation.service';

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  exists: jest.fn().mockResolvedValue(0),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockRedis),
}));

describe('TokenRevocationService', () => {
  let service: TokenRevocationService;
  let logger: { log: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    logger = {
      log: jest.fn(),
      warn: jest.fn(),
    };

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string | number> = {
          'redis.host': 'localhost',
          'redis.port': 6379,
          'redis.password': '',
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    service = new TokenRevocationService(configService, logger as never);
  });

  describe('revoke', () => {
    it('stores a JTI key in Redis with the given TTL', async () => {
      await service.revoke('jti-abc-123', 3600);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'revoked-jti:jti-abc-123',
        '1',
        'EX',
        3600,
      );
    });

    it('logs the revocation with jti and ttl', async () => {
      await service.revoke('jti-abc-123', 1800);

      expect(logger.log).toHaveBeenCalledWith(
        'Token revoked',
        expect.objectContaining({
          jti: 'jti-abc-123',
          ttlSeconds: 1800,
        }),
      );
    });
  });

  describe('isRevoked', () => {
    it('returns true when the JTI exists in Redis', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.isRevoked('jti-revoked');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('revoked-jti:jti-revoked');
    });

    it('returns false when the JTI does not exist in Redis', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.isRevoked('jti-unknown');

      expect(result).toBe(false);
      expect(mockRedis.exists).toHaveBeenCalledWith('revoked-jti:jti-unknown');
    });

    it('returns false and logs a warning when Redis is unavailable (fail-open)', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Connection refused'));

      const result = await service.isRevoked('jti-check');

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Redis unavailable for revocation check — failing open',
        expect.objectContaining({
          jti: 'jti-check',
          error: 'Connection refused',
        }),
      );
    });

    it('handles non-Error thrown values gracefully', async () => {
      mockRedis.exists.mockRejectedValue('unexpected string error');

      const result = await service.isRevoked('jti-edge');

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Redis unavailable for revocation check — failing open',
        expect.objectContaining({
          jti: 'jti-edge',
          error: 'unexpected string error',
        }),
      );
    });
  });
});
