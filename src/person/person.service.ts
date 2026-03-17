import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Person } from './person.types';
import { CreatePersonInput } from './person.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PaginationArgs } from '../common/dto/pagination.args';

@Injectable()
export class PersonService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    @InjectQueue('person')
    private readonly personQueue: Queue,
  ) {}

  async findAll(
    pagination: PaginationArgs,
  ): Promise<{ items: Person[]; total: number; hasMore: boolean }> {
    this.logger.log('Finding all people', PersonService.name);

    const [items, total] = await Promise.all([
      this.prismaService.person.findMany({
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prismaService.person.count(),
    ]);

    return {
      items,
      total,
      hasMore: pagination.skip + pagination.take < total,
    };
  }

  async findOne(id: number): Promise<Person> {
    this.logger.debug('Finding one person', PersonService.name);

    const person = await this.prismaService.person.findUnique({
      where: {
        id,
      },
    });

    if (!person) {
      throw new NotFoundException(`Person with id ${id} not found`);
    }

    return person;
  }

  async create(personInput: CreatePersonInput): Promise<Person> {
    this.logger.debug('Creating person', PersonService.name);

    const person = await this.prismaService.person.create({
      data: personInput,
    });

    const job = await this.personQueue.add('create-person', person);

    this.logger.log(`Person created with id ${person.id}`, {
      personId: person.id,
      jobId: job.id,
    });
    return person;
  }
}
