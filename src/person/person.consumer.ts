import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Processor('person')
export class PersonConsumer {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @Process('create-person')
  async personCreatedResponder(job: Job<unknown>) {
    const data = job.data;
    await this.logger.log('personCreatedResponder');
    return data;
  }
}
