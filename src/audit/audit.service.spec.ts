import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditEvent } from './types/audit-event.types';

describe('AuditService', () => {
  let service: AuditService;
  let auditRepository: { create: jest.Mock };
  let logger: { error: jest.Mock };

  beforeEach(() => {
    auditRepository = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    logger = {
      error: jest.fn(),
    };

    service = new AuditService(
      auditRepository as unknown as AuditRepository,
      logger as never,
    );
  });

  it('creates an audit entry via the repository', async () => {
    const event: AuditEvent = {
      action: 'PERSON_CREATED',
      userId: 'user-123',
      targetType: 'Person',
      targetId: '42',
      correlationId: 'corr-abc',
    };

    await service.log(event);

    expect(auditRepository.create).toHaveBeenCalledWith(event);
  });

  it('does not throw when the repository fails', async () => {
    auditRepository.create.mockRejectedValue(new Error('DB connection lost'));

    const event: AuditEvent = {
      action: 'AUTH_LOGIN',
      userId: 'user-456',
    };

    await expect(service.log(event)).resolves.toBeUndefined();
  });

  it('logs an error when the repository fails', async () => {
    auditRepository.create.mockRejectedValue(new Error('DB connection lost'));

    const event: AuditEvent = {
      action: 'AUTH_LOGIN',
      userId: 'user-456',
    };

    await service.log(event);

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to write audit log',
      expect.objectContaining({
        event,
        error: 'DB connection lost',
      }),
    );
  });
});
