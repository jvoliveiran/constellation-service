import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SendEmailJob } from './types/send-email-job.types';

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('email-sending')
    private readonly emailQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async send(email: SendEmailJob): Promise<void> {
    await this.emailQueue.add('send-email', email, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.debug('Email enqueued', {
      to: email.to,
      subject: email.subject,
      context: EmailService.name,
    });
  }
}
