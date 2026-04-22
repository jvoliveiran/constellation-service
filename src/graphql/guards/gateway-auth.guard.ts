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
import { JwtService } from '@nestjs/jwt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { isJwtPayload } from '../types';
import { TokenRevocationService } from '../../auth/token-revocation.service';

const USER_CONTEXT_HEADER = 'x-user-context';
const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly federationEnabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {
    this.federationEnabled = this.configService.get<boolean>(
      'app.federationEnabled',
      false,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    const correlationId: string = req.correlationId ?? '';

    if (this.federationEnabled) {
      return this.validateGatewayContext(req, correlationId);
    }

    return this.validateBearerToken(req, correlationId);
  }

  private async validateBearerToken(
    req: {
      headers: Record<string, string | undefined>;
      user?: unknown;
      correlationId?: string;
    },
    correlationId: string,
  ): Promise<boolean> {
    const authHeader = req.headers['authorization'] as string | undefined;

    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      this.logger.warn('Missing or invalid Authorization header', {
        correlationId,
        reason: 'missing bearer token',
        context: GatewayAuthGuard.name,
      });
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.slice(BEARER_PREFIX.length);

    let payload: Record<string, unknown>;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      this.logger.warn('Invalid JWT token', {
        correlationId,
        reason: 'jwt verification failed',
        context: GatewayAuthGuard.name,
      });
      throw new UnauthorizedException('Invalid authorization token');
    }

    req.user = payload;

    this.logger.debug('Bearer token validated successfully', {
      userId: payload.sub,
      correlationId,
      context: GatewayAuthGuard.name,
    });

    return true;
  }

  private async validateGatewayContext(
    req: {
      headers: Record<string, string | undefined>;
      user?: unknown;
      correlationId?: string;
    },
    correlationId: string,
  ): Promise<boolean> {
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

    if (parsed.jti) {
      const isRevoked = await this.tokenRevocationService.isRevoked(parsed.jti);
      if (isRevoked) {
        this.logger.warn('Revoked token rejected', {
          jti: parsed.jti,
          userId: parsed.sub,
          correlationId,
          context: GatewayAuthGuard.name,
        });
        throw new UnauthorizedException('Token has been revoked');
      }
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
