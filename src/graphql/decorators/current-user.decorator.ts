import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtPayload } from '../types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    return req.user as JwtPayload;
  },
);
