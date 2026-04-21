import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GatewayAuthGuard } from './gateway-auth.guard';
import { JwtPayload } from '../types';
import { TokenRevocationService } from '../../auth/token-revocation.service';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('GatewayAuthGuard', () => {
  let guard: GatewayAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;
  let logger: { warn: jest.Mock; debug: jest.Mock };
  let tokenRevocationService: { isRevoked: jest.Mock };

  const validPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    roles: ['admin'],
    permissions: ['person:read'],
  };

  const validPayloadWithJti: JwtPayload = {
    ...validPayload,
    jti: 'token-jti-abc',
  };

  function encodePayload(payload: unknown): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  function buildMockContext(headers: Record<string, string> = {}): {
    executionContext: ExecutionContext;
    req: Record<string, unknown>;
  } {
    const req = {
      headers,
      correlationId: 'test-correlation-id',
      user: undefined as unknown,
    };

    const executionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    (GqlExecutionContext.create as jest.Mock).mockReturnValue({
      getContext: () => ({ req }),
    });

    return { executionContext, req };
  }

  function createGuard(federationEnabled = true) {
    configService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          if (key === 'app.federationEnabled') return federationEnabled;
          return defaultValue;
        }),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new GatewayAuthGuard(
      reflector,
      configService,
      logger as never,
      tokenRevocationService as unknown as TokenRevocationService,
    );
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    logger = {
      warn: jest.fn(),
      debug: jest.fn(),
    };

    tokenRevocationService = {
      isRevoked: jest.fn().mockResolvedValue(false),
    };

    createGuard(true);
  });

  it('allows access and sets req.user for a valid x-user-context header', async () => {
    const { executionContext, req } = buildMockContext({
      'x-user-context': encodePayload(validPayload),
    });

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(req.user).toEqual(validPayload);
    expect(logger.debug).toHaveBeenCalledWith(
      'Gateway auth context parsed successfully',
      expect.objectContaining({ userId: 'user-123' }),
    );
  });

  it('skips validation for public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { executionContext } = buildMockContext({});

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
  });

  it('throws UnauthorizedException when x-user-context header is missing', async () => {
    const { executionContext } = buildMockContext({});

    await expect(guard.canActivate(executionContext)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Missing x-user-context header',
      expect.objectContaining({ reason: 'missing header' }),
    );
  });

  it('throws UnauthorizedException for invalid base64', async () => {
    const { executionContext } = buildMockContext({
      'x-user-context': '!!!not-valid-base64!!!',
    });

    // Buffer.from with 'base64' does not throw for invalid input — it decodes garbage.
    // The JSON.parse step catches this as invalid JSON.
    await expect(guard.canActivate(executionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for valid base64 but invalid JSON', async () => {
    const { executionContext } = buildMockContext({
      'x-user-context': Buffer.from('not-json').toString('base64'),
    });

    await expect(guard.canActivate(executionContext)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to parse x-user-context JSON',
      expect.objectContaining({ reason: 'invalid JSON' }),
    );
  });

  it('throws UnauthorizedException when payload fails type guard', async () => {
    const incompletePayload = { sub: 'user-123', email: 'test@example.com' };
    const { executionContext } = buildMockContext({
      'x-user-context': encodePayload(incompletePayload),
    });

    await expect(guard.canActivate(executionContext)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'x-user-context payload failed type validation',
      expect.objectContaining({ reason: 'invalid payload shape' }),
    );
  });

  it('throws UnauthorizedException when payload is a string', async () => {
    const { executionContext } = buildMockContext({
      'x-user-context': encodePayload('just-a-string'),
    });

    await expect(guard.canActivate(executionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when payload is null', async () => {
    const { executionContext } = buildMockContext({
      'x-user-context': encodePayload(null),
    });

    await expect(guard.canActivate(executionContext)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows access without x-user-context when federation is disabled', async () => {
    createGuard(false);
    const { executionContext } = buildMockContext({});

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
  });

  describe('token revocation', () => {
    it('rejects a request with a revoked token', async () => {
      tokenRevocationService.isRevoked.mockResolvedValue(true);
      const { executionContext } = buildMockContext({
        'x-user-context': encodePayload(validPayloadWithJti),
      });

      await expect(guard.canActivate(executionContext)).rejects.toThrow(
        new UnauthorizedException('Token has been revoked'),
      );
      expect(tokenRevocationService.isRevoked).toHaveBeenCalledWith(
        'token-jti-abc',
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Revoked token rejected',
        expect.objectContaining({
          jti: 'token-jti-abc',
          userId: 'user-123',
        }),
      );
    });

    it('allows a request with a valid non-revoked token', async () => {
      tokenRevocationService.isRevoked.mockResolvedValue(false);
      const { executionContext, req } = buildMockContext({
        'x-user-context': encodePayload(validPayloadWithJti),
      });

      await expect(guard.canActivate(executionContext)).resolves.toBe(true);
      expect(tokenRevocationService.isRevoked).toHaveBeenCalledWith(
        'token-jti-abc',
      );
      expect(req.user).toEqual(validPayloadWithJti);
    });

    it('skips revocation check when jti is missing from payload', async () => {
      const { executionContext, req } = buildMockContext({
        'x-user-context': encodePayload(validPayload),
      });

      await expect(guard.canActivate(executionContext)).resolves.toBe(true);
      expect(tokenRevocationService.isRevoked).not.toHaveBeenCalled();
      expect(req.user).toEqual(validPayload);
    });
  });
});
