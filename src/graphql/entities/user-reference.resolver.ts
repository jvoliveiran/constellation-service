import { Inject, Logger } from '@nestjs/common';
import { ResolveReference, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserReference } from './user-reference.types';

@Resolver(() => UserReference)
export class UserReferenceResolver {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @ResolveReference()
  resolveReference(reference: {
    __typename: string;
    id: string;
  }): UserReference {
    this.logger.debug('Resolving User entity reference', {
      userId: reference.id,
      context: UserReferenceResolver.name,
    });

    return { id: reference.id } as UserReference;
  }
}
