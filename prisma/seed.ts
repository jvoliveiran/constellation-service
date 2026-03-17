import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PERSONS = [
  { id: 1, name: 'Alice Johnson', age: 30 },
  { id: 2, name: 'Bob Smith', age: 25 },
  { id: 3, name: 'Charlie Brown', age: 35 },
  { id: 4, name: 'Diana Prince', age: 28 },
  { id: 5, name: 'Eve Williams', age: 22 },
];

async function main() {
  console.log('Seeding database...');

  for (const person of SEED_PERSONS) {
    await prisma.person.upsert({
      where: { id: person.id },
      update: { name: person.name, age: person.age },
      create: person,
    });
  }

  console.log(`Seeded ${SEED_PERSONS.length} person records.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
