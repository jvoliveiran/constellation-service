import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Person } from './person.types';
import { CreatePersonInput } from './person.dto';
import { PersonRepository } from './person.repository';
import { CursorPaginationArgs } from '../common/dto/cursor-pagination.args';
import { CursorPaginatedResult } from '../common/dto/cursor-paginated-response.factory';
import { encodeCursor, decodeCursor } from '../common/utils/cursor.utils';

@Injectable()
export class PersonService {
  constructor(
    private readonly personRepository: PersonRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    @InjectQueue('person')
    private readonly personQueue: Queue,
  ) {}

  async findAll(
    pagination: CursorPaginationArgs,
  ): Promise<CursorPaginatedResult<Person>> {
    this.logger.log('Finding all people', PersonService.name);

    const afterCursor = pagination.after
      ? decodeCursor(pagination.after)
      : undefined;

    const { items, hasMore } = await this.personRepository.findMany(
      pagination.first,
      afterCursor,
    );

    const lastItem = items[items.length - 1];
    const endCursor = lastItem
      ? encodeCursor(lastItem.createdAt, lastItem.id)
      : null;

    const total = await this.personRepository.count();

    return { items, hasMore, endCursor, total };
  }

  async findOne(id: number): Promise<Person> {
    this.logger.debug('Finding one person', PersonService.name);

    const person = await this.personRepository.findById(id);

    if (!person) {
      throw new NotFoundException(`Person with id ${id} not found`);
    }

    return person;
  }

  async create(personInput: CreatePersonInput): Promise<Person> {
    this.logger.debug('Creating person', PersonService.name);

    const person = await this.personRepository.create(personInput);

    const job = await this.personQueue.add('create-person', person);

    this.logger.log(`Person created with id ${person.id}`, {
      personId: person.id,
      jobId: job.id,
    });

    return person;
  }
}
