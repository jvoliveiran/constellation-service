import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Person } from './person.types';

@Processor('person')
export class PersonConsumer {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @Process('create-person')
  async personCreatedResponder(job: Job<Person>) {
    const person = job.data;
    this.logger.log(
      `Processing create-person job for person id ${person.id}`,
      PersonConsumer.name,
    );
    return person;
  }
}
