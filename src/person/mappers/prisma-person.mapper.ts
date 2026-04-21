import { Person as PrismaPerson } from '@prisma/client';
import { Person } from '../person.types';

export function mapPrismaPersonToGraphql(prismaPerson: PrismaPerson): Person {
  return {
    id: prismaPerson.id,
    name: prismaPerson.name,
    age: prismaPerson.age,
    createdAt: prismaPerson.createdAt,
  };
}
