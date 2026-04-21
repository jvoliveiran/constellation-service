import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditCleanupProcessor } from './audit-cleanup.processor';
import { AuditCronRegistrar } from './audit-cron.registrar';
import { AuditResolver } from './audit.resolver';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: 'audit-cleanup' })],
  providers: [
    AuditService,
    AuditRepository,
    AuditCleanupProcessor,
    AuditCronRegistrar,
    AuditResolver,
  ],
  exports: [AuditService],
})
export class AuditModule {}
