import { Injectable, Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuditRepository } from './audit.repository';
import { AuditEvent } from './types/audit-event.types';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async log(event: AuditEvent): Promise<void> {
    try {
      await this.auditRepository.create(event);
    } catch (error: unknown) {
      this.logger.error('Failed to write audit log', {
        event,
        error: error instanceof Error ? error.message : String(error),
        context: AuditService.name,
      });
    }
  }
}
