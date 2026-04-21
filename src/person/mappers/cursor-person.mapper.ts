import { Person as PrismaPerson } from '@prisma/client';
import { CursorPaginatedResult } from '../../common/dto/cursor-paginated-response.factory';
import { Person } from '../person.types';
import { mapPrismaPersonToGraphql } from './prisma-person.mapper';
import { encodeCursor } from '../../common/utils/cursor.utils';

type PaginatedPrismaPersonInput = {
  items: PrismaPerson[];
  hasMore: boolean;
  total: number;
};

export function mapToCursorPaginatedPersonResponse(
  input: PaginatedPrismaPersonInput,
): CursorPaginatedResult<Person> {
  const mappedItems = input.items.map(mapPrismaPersonToGraphql);
  const lastItem = input.items[input.items.length - 1];

  return {
    items: mappedItems,
    hasMore: input.hasMore,
    endCursor: lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null,
    total: input.total,
  };
}
