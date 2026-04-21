import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuditRepository } from './audit.repository';

@Processor('audit-cleanup')
export class AuditCleanupProcessor extends WorkerHost {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(): Promise<void> {
    const retentionDays = this.configService.get<number>(
      'auditRetention.retentionDays',
      90,
    );
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount = await this.auditRepository.deleteOlderThan(cutoffDate);

    this.logger.log('Audit cleanup completed', {
      deletedCount,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      context: AuditCleanupProcessor.name,
    });
  }
}
