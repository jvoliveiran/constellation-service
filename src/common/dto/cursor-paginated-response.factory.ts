import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

export type CursorPaginatedResult<T, TFilter = unknown> = {
  items: T[];
  hasMore: boolean;
  endCursor: string | null;
  total?: number | null;
  _filterContext?: TFilter;
};

export function CursorPaginated<T, TFilter = unknown>(
  classRef: Type<T>,
): Type<CursorPaginatedResult<T, TFilter>> {
  @ObjectType({ isAbstract: true })
  abstract class CursorPaginatedType {
    @Field(() => [classRef], {
      description: 'The list of items for the current page.',
    })
    items: T[];

    @Field(() => Boolean, {
      description: 'Whether there are more items after this page.',
    })
    hasMore: boolean;

    @Field(() => String, {
      nullable: true,
      description:
        'Opaque cursor pointing to the last item. Pass as "after" to fetch the next page. Null when the result set is empty.',
    })
    endCursor: string | null;

    @Field(() => Int, {
      nullable: true,
      description:
        'Total number of items matching the filter. Only computed when this field is selected in the query.',
    })
    total?: number | null;

    // Not decorated with @Field — not exposed in the GraphQL schema.
    // Carries the filter context so @ResolveField('total') can run COUNT with the same filters.
    _filterContext?: TFilter;
  }

  return CursorPaginatedType as unknown as Type<
    CursorPaginatedResult<T, TFilter>
  >;
}
