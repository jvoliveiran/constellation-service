import { Injectable, Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Person as PrismaPerson } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonInput } from './person.dto';
import { DecodedCursor } from '../common/types/decoded-cursor.types';

type FindManyResult = {
  items: PrismaPerson[];
  hasMore: boolean;
};

@Injectable()
export class PersonRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async findMany(
    first: number,
    afterCursor?: DecodedCursor,
  ): Promise<FindManyResult> {
    this.logger.debug(
      `Finding persons: first=${first}, after=${afterCursor ? 'cursor' : 'none'}`,
      PersonRepository.name,
    );

    const whereClause = afterCursor
      ? {
          OR: [
            { createdAt: { lt: afterCursor.createdAt } },
            {
              createdAt: afterCursor.createdAt,
              id: { lt: afterCursor.id as number },
            },
          ],
        }
      : {};

    // Fetch one extra to determine hasMore
    const items = await this.prisma.person.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: first + 1,
    });

    const hasMore = items.length > first;
    if (hasMore) {
      items.pop();
    }

    return { items, hasMore };
  }

  async count(): Promise<number> {
    return this.prisma.person.count();
  }

  async findById(id: number): Promise<PrismaPerson | null> {
    this.logger.debug(`Finding person by id=${id}`, PersonRepository.name);

    return this.prisma.person.findUnique({
      where: { id },
    });
  }

  async create(data: CreatePersonInput): Promise<PrismaPerson> {
    const person = await this.prisma.person.create({
      data,
    });

    this.logger.log(
      `Person created with id=${person.id}`,
      PersonRepository.name,
    );

    return person;
  }
}
