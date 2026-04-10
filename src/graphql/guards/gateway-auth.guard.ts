import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { isJwtPayload } from '../types';

const USER_CONTEXT_HEADER = 'x-user-context';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly federationEnabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {
    this.federationEnabled = this.configService.get<boolean>(
      'app.federationEnabled',
      false,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!this.federationEnabled) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    const correlationId: string = req.correlationId ?? '';

    const encodedContext = req.headers[USER_CONTEXT_HEADER] as
      | string
      | undefined;

    if (!encodedContext) {
      this.logger.warn('Missing x-user-context header', {
        correlationId,
        reason: 'missing header',
        context: GatewayAuthGuard.name,
      });
      throw new UnauthorizedException('No user context provided by gateway');
    }

    let decoded: string;
    try {
      decoded = Buffer.from(encodedContext, 'base64').toString('utf-8');
    } catch {
      this.logger.warn('Failed to decode x-user-context header', {
        correlationId,
        reason: 'invalid base64',
        context: GatewayAuthGuard.name,
      });
      throw new UnauthorizedException('Invalid user context encoding');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      this.logger.warn('Failed to parse x-user-context JSON', {
        correlationId,
        reason: 'invalid JSON',
        context: GatewayAuthGuard.name,
      });
      throw new UnauthorizedException('Invalid user context format');
    }

    if (!isJwtPayload(parsed)) {
      this.logger.warn('x-user-context payload failed type validation', {
        correlationId,
        reason: 'invalid payload shape',
        context: GatewayAuthGuard.name,
      });
      throw new UnauthorizedException('Invalid user context payload');
    }

    req.user = parsed;

    this.logger.debug('Gateway auth context parsed successfully', {
      userId: parsed.sub,
      correlationId,
      context: GatewayAuthGuard.name,
    });

    return true;
  }
}
