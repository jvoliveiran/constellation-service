import { AuditResolver } from './audit.resolver';
import { AuditRepository } from './audit.repository';

describe('AuditResolver', () => {
  let resolver: AuditResolver;
  let auditRepository: { findMany: jest.Mock };

  const mockAuditLogs = [
    {
      id: 1,
      action: 'PERSON_CREATED',
      userId: 'user-123',
      targetType: 'Person',
      targetId: '42',
      metadata: null,
      ipAddress: null,
      userAgent: null,
      correlationId: 'corr-abc',
      createdAt: new Date('2026-04-20T10:00:00.000Z'),
    },
  ];

  beforeEach(() => {
    auditRepository = {
      findMany: jest.fn().mockResolvedValue(mockAuditLogs),
    };

    resolver = new AuditResolver(auditRepository as unknown as AuditRepository);
  });

  it('returns audit logs from the repository with a filter', async () => {
    const filter = { userId: 'user-123', action: 'PERSON_CREATED' };

    const result = await resolver.getAuditLogs(filter);

    expect(result).toEqual(mockAuditLogs);
    expect(auditRepository.findMany).toHaveBeenCalledWith(filter);
  });

  it('passes an empty filter when no filter is provided', async () => {
    const result = await resolver.getAuditLogs(undefined);

    expect(result).toEqual(mockAuditLogs);
    expect(auditRepository.findMany).toHaveBeenCalledWith({});
  });
});
