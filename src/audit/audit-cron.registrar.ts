import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AuditCronRegistrar implements OnModuleInit {
  constructor(
    @InjectQueue('audit-cleanup')
    private readonly auditCleanupQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.auditCleanupQueue.add(
      'cleanup',
      {},
      {
        repeat: { pattern: '0 2 * * *' },
      },
    );

    this.logger.log('Audit cleanup cron registered', {
      schedule: '0 2 * * * (daily at 02:00 UTC)',
      context: AuditCronRegistrar.name,
    });
  }
}
