import { Person as PrismaPerson } from '@prisma/client';
import { mapToCursorPaginatedPersonResponse } from './cursor-person.mapper';
import { encodeCursor } from '../../common/utils/cursor.utils';

describe('mapToCursorPaginatedPersonResponse', () => {
  const buildPrismaPerson = (
    overrides: Partial<PrismaPerson> = {},
  ): PrismaPerson => ({
    id: 1,
    name: 'Default',
    age: 25,
    createdAt: new Date('2025-06-15T10:00:00.000Z'),
    ...overrides,
  });

  it('maps a paginated result with items', () => {
    const person1 = buildPrismaPerson({ id: 1, name: 'Alice' });
    const person2 = buildPrismaPerson({
      id: 2,
      name: 'Bob',
      createdAt: new Date('2025-06-14T10:00:00.000Z'),
    });

    const result = mapToCursorPaginatedPersonResponse({
      items: [person1, person2],
      hasMore: true,
      total: 10,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      id: 1,
      name: 'Alice',
      age: 25,
      createdAt: person1.createdAt,
    });
    expect(result.items[1]).toEqual({
      id: 2,
      name: 'Bob',
      age: 25,
      createdAt: person2.createdAt,
    });
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(10);
  });

  it('maps an empty paginated result with null endCursor', () => {
    const result = mapToCursorPaginatedPersonResponse({
      items: [],
      hasMore: false,
      total: 0,
    });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.endCursor).toBeNull();
    expect(result.total).toBe(0);
  });

  it('encodes the cursor from the last item in the list', () => {
    const lastPerson = buildPrismaPerson({
      id: 99,
      createdAt: new Date('2025-03-20T08:00:00.000Z'),
    });

    const result = mapToCursorPaginatedPersonResponse({
      items: [buildPrismaPerson({ id: 1 }), lastPerson],
      hasMore: false,
      total: 2,
    });

    const expectedCursor = encodeCursor(lastPerson.createdAt, lastPerson.id);
    expect(result.endCursor).toBe(expectedCursor);
  });

  it('sets hasMore to false when there are no more pages', () => {
    const result = mapToCursorPaginatedPersonResponse({
      items: [buildPrismaPerson()],
      hasMore: false,
      total: 1,
    });

    expect(result.hasMore).toBe(false);
  });
});
