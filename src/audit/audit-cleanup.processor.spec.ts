import { ConfigService } from '@nestjs/config';
import { AuditCleanupProcessor } from './audit-cleanup.processor';
import { AuditRepository } from './audit.repository';

describe('AuditCleanupProcessor', () => {
  let processor: AuditCleanupProcessor;
  let auditRepository: { deleteOlderThan: jest.Mock };
  let configService: { get: jest.Mock };
  let logger: { log: jest.Mock };

  beforeEach(() => {
    auditRepository = {
      deleteOlderThan: jest.fn().mockResolvedValue(15),
    };

    configService = {
      get: jest.fn().mockReturnValue(90),
    };

    logger = {
      log: jest.fn(),
    };

    processor = new AuditCleanupProcessor(
      auditRepository as unknown as AuditRepository,
      configService as unknown as ConfigService,
      logger as never,
    );
  });

  it('deletes audit entries older than the configured retention period', async () => {
    const now = new Date('2026-04-21T02:00:00.000Z');
    jest.useFakeTimers({ now });

    await processor.process();

    const expectedCutoff = new Date('2026-04-21T02:00:00.000Z');
    expectedCutoff.setDate(expectedCutoff.getDate() - 90);

    expect(auditRepository.deleteOlderThan).toHaveBeenCalledWith(
      expectedCutoff,
    );

    jest.useRealTimers();
  });

  it('uses the retention days from config', async () => {
    configService.get.mockReturnValue(30);
    jest.useFakeTimers({ now: new Date('2026-04-21T02:00:00.000Z') });

    await processor.process();

    const expectedCutoff = new Date('2026-04-21T02:00:00.000Z');
    expectedCutoff.setDate(expectedCutoff.getDate() - 30);

    expect(auditRepository.deleteOlderThan).toHaveBeenCalledWith(
      expectedCutoff,
    );
    expect(configService.get).toHaveBeenCalledWith(
      'auditRetention.retentionDays',
      90,
    );

    jest.useRealTimers();
  });

  it('logs the cleanup result', async () => {
    jest.useFakeTimers({ now: new Date('2026-04-21T02:00:00.000Z') });
    auditRepository.deleteOlderThan.mockResolvedValue(42);

    await processor.process();

    expect(logger.log).toHaveBeenCalledWith(
      'Audit cleanup completed',
      expect.objectContaining({
        deletedCount: 42,
        retentionDays: 90,
      }),
    );

    jest.useRealTimers();
  });
});
