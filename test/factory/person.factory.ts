import { Person } from 'src/person/person.types';
import { PrismaService } from 'src/prisma/prisma.service';

export const create = (
  person: Omit<Person, 'id' | 'createdAt'>,
  prisma: PrismaService,
) => {
  return prisma.person.create({
    data: person,
  });
};
