import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Person } from './person.types';

@Processor('person')
export class PersonConsumer extends WorkerHost {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<Person>): Promise<Person> {
    this.logger.log(
      `Processing ${job.name} job ${job.id} for person id ${job.data.id}`,
      PersonConsumer.name,
    );
    return job.data;
  }
}
