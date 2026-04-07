import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GatewayAuthGuard } from './gateway-auth.guard';
import { JwtPayload } from '../types';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('GatewayAuthGuard', () => {
  let guard: GatewayAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let logger: { warn: jest.Mock; debug: jest.Mock };

  const validPayload: JwtPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    roles: ['admin'],
    permissions: ['person:read'],
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

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    logger = {
      warn: jest.fn(),
      debug: jest.fn(),
    };

    guard = new GatewayAuthGuard(reflector, logger as never);
  });

  it('allows access and sets req.user for a valid x-user-context header', () => {
    const { executionContext, req } = buildMockContext({
      'x-user-context': encodePayload(validPayload),
    });

    expect(guard.canActivate(executionContext)).toBe(true);
    expect(req.user).toEqual(validPayload);
    expect(logger.debug).toHaveBeenCalledWith(
      'Gateway auth context parsed successfully',
      expect.objectContaining({ userId: 'user-123' }),
    );
  });

  it('skips validation for public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { executionContext } = buildMockContext({});

    expect(guard.canActivate(executionContext)).toBe(true);
  });

  it('throws UnauthorizedException when x-user-context header is missing', () => {
    const { executionContext } = buildMockContext({});

    expect(() => guard.canActivate(executionContext)).toThrow(
      UnauthorizedException,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Missing x-user-context header',
      expect.objectContaining({ reason: 'missing header' }),
    );
  });

  it('throws UnauthorizedException for invalid base64', () => {
    const { executionContext } = buildMockContext({
      'x-user-context': '!!!not-valid-base64!!!',
    });

    // Buffer.from with 'base64' does not throw for invalid input — it decodes garbage.
    // The JSON.parse step catches this as invalid JSON.
    expect(() => guard.canActivate(executionContext)).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for valid base64 but invalid JSON', () => {
    const { executionContext } = buildMockContext({
      'x-user-context': Buffer.from('not-json').toString('base64'),
    });

    expect(() => guard.canActivate(executionContext)).toThrow(
      UnauthorizedException,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to parse x-user-context JSON',
      expect.objectContaining({ reason: 'invalid JSON' }),
    );
  });

  it('throws UnauthorizedException when payload fails type guard', () => {
    const incompletePayload = { sub: 'user-123', email: 'test@example.com' };
    const { executionContext } = buildMockContext({
      'x-user-context': encodePayload(incompletePayload),
    });

    expect(() => guard.canActivate(executionContext)).toThrow(
      UnauthorizedException,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'x-user-context payload failed type validation',
      expect.objectContaining({ reason: 'invalid payload shape' }),
    );
  });

  it('throws UnauthorizedException when payload is a string', () => {
    const { executionContext } = buildMockContext({
      'x-user-context': encodePayload('just-a-string'),
    });

    expect(() => guard.canActivate(executionContext)).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when payload is null', () => {
    const { executionContext } = buildMockContext({
      'x-user-context': encodePayload(null),
    });

    expect(() => guard.canActivate(executionContext)).toThrow(
      UnauthorizedException,
    );
  });
});
