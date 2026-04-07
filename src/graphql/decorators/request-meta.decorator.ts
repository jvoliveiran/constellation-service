import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

type RequestMetaData = {
  correlationId: string;
  ipAddress: string;
  userAgent: string;
};

export const RequestMeta = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestMetaData => {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();

    return {
      correlationId: req.correlationId ?? '',
      ipAddress: req.ip ?? '',
      userAgent: req.headers?.['user-agent'] ?? '',
    };
  },
);
