import { Person as PrismaPerson } from '@prisma/client';
import { mapPrismaPersonToGraphql } from './prisma-person.mapper';

describe('mapPrismaPersonToGraphql', () => {
  it('maps all fields correctly from Prisma Person to GraphQL Person', () => {
    const createdAt = new Date('2025-06-15T10:30:00.000Z');
    const prismaPerson: PrismaPerson = {
      id: 42,
      name: 'Alice',
      age: 30,
      createdAt,
    };

    const result = mapPrismaPersonToGraphql(prismaPerson);

    expect(result).toEqual({
      id: 42,
      name: 'Alice',
      age: 30,
      createdAt,
    });
  });

  it('preserves the Date object reference for createdAt', () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const prismaPerson: PrismaPerson = {
      id: 1,
      name: 'Bob',
      age: 25,
      createdAt,
    };

    const result = mapPrismaPersonToGraphql(prismaPerson);

    expect(result.createdAt).toBe(createdAt);
  });

  it('does not carry over extra properties from the Prisma model', () => {
    const prismaPerson = {
      id: 7,
      name: 'Charlie',
      age: 40,
      createdAt: new Date(),
      _count: { posts: 5 },
    } as PrismaPerson & { _count: { posts: number } };

    const result = mapPrismaPersonToGraphql(prismaPerson);

    expect(Object.keys(result)).toEqual(['id', 'name', 'age', 'createdAt']);
  });
});
