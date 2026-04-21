import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuditLogType, AuditLogFilterInput } from './audit.types';
import { AuditRepository } from './audit.repository';
import { RequirePermissions } from '../graphql/decorators/require-permissions.decorator';

@Resolver()
export class AuditResolver {
  constructor(private readonly auditRepository: AuditRepository) {}

  @Query(() => [AuditLogType], {
    description: 'Retrieve audit log entries with optional filters.',
  })
  @RequirePermissions('audit:read')
  async getAuditLogs(
    @Args('filter', { nullable: true }) filter?: AuditLogFilterInput,
  ): Promise<AuditLogType[]> {
    return this.auditRepository.findMany(filter ?? {});
  }
}
