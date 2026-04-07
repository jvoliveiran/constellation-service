import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { JwtPayload } from '../types';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let logger: { warn: jest.Mock; debug: jest.Mock };

  const userWithPermissions = (permissions: string[]): JwtPayload => ({
    sub: 'user-123',
    email: 'test@example.com',
    roles: ['admin'],
    permissions,
  });

  function buildMockContext(user: unknown = undefined): ExecutionContext {
    const req = {
      user,
      correlationId: 'test-correlation-id',
    };

    const executionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    (GqlExecutionContext.create as jest.Mock).mockReturnValue({
      getContext: () => ({ req }),
    });

    return executionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    logger = {
      warn: jest.fn(),
      debug: jest.fn(),
    };

    guard = new PermissionsGuard(reflector, logger as never);
  });

  it('allows access when route is public', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    const context = buildMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when no permissions are required', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === REQUIRE_PERMISSIONS_KEY) return undefined;
      return undefined;
    });

    const context = buildMockContext(userWithPermissions([]));
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when empty permissions array is required', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === REQUIRE_PERMISSIONS_KEY) return [];
      return undefined;
    });

    const context = buildMockContext(userWithPermissions([]));
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user has all required permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === REQUIRE_PERMISSIONS_KEY)
        return ['person:read', 'person:create'];
      return undefined;
    });

    const user = userWithPermissions([
      'person:read',
      'person:create',
      'person:delete',
    ]);
    const context = buildMockContext(user);

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      'Permission check passed',
      expect.objectContaining({ userId: 'user-123' }),
    );
  });

  it('throws ForbiddenException when user is missing a required permission', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === REQUIRE_PERMISSIONS_KEY)
        return ['person:read', 'person:delete'];
      return undefined;
    });

    const user = userWithPermissions(['person:read']);
    const context = buildMockContext(user);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(
      'Permission check failed',
      expect.objectContaining({
        userId: 'user-123',
        requiredPermissions: ['person:read', 'person:delete'],
      }),
    );
  });

  it('throws ForbiddenException when no user context exists', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['person:read'];
      return undefined;
    });

    const context = buildMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(
      'PermissionsGuard — no valid user context',
      expect.objectContaining({ requiredPermissions: ['person:read'] }),
    );
  });

  it('throws ForbiddenException when user context is invalid shape', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['person:read'];
      return undefined;
    });

    const context = buildMockContext({ sub: 'user-123' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
