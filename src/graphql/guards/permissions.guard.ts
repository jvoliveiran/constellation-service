import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { isJwtPayload } from '../types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    const correlationId: string = req.correlationId ?? '';
    const user: unknown = req.user;

    if (!isJwtPayload(user)) {
      this.logger.warn('PermissionsGuard — no valid user context', {
        requiredPermissions,
        correlationId,
        context: PermissionsGuard.name,
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (hasAllPermissions) {
      this.logger.debug('Permission check passed', {
        userId: user.sub,
        requiredPermissions,
        correlationId,
        context: PermissionsGuard.name,
      });
      return true;
    }

    this.logger.warn('Permission check failed', {
      userId: user.sub,
      requiredPermissions,
      userPermissions: user.permissions,
      correlationId,
      context: PermissionsGuard.name,
    });

    throw new ForbiddenException('Insufficient permissions');
  }
}
