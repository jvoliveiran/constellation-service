import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

export function Paginated<T>(classRef: Type<T>): Type<{
  items: T[];
  total: number;
  hasMore: boolean;
}> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [classRef])
    items: T[];

    @Field(() => Int)
    total: number;

    @Field()
    hasMore: boolean;
  }

  return PaginatedType as Type<{
    items: T[];
    total: number;
    hasMore: boolean;
  }>;
}
