import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { SendEmailJob } from './types/send-email-job.types';

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'msg-1' });
const mockCreateTransport = jest
  .fn()
  .mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({
  __esModule: true,
  createTransport: (...args: unknown[]) => mockCreateTransport(...args),
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(),
  SendRawEmailCommand: jest.fn(),
}));

import { EmailProcessor } from './email.processor';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let logger: { log: jest.Mock; error: jest.Mock };

  function buildConfigService(overrides: Record<string, string | number> = {}) {
    const config: Record<string, string | number> = {
      'email.smtpHost': 'localhost',
      'email.smtpPort': 1025,
      'email.fromName': 'Test Service',
      'email.fromAddress': 'test@example.com',
      'aws.ses.region': '',
      'aws.ses.accessKeyId': '',
      'aws.ses.secretAccessKey': '',
      ...overrides,
    };

    return {
      get: jest.fn().mockImplementation((key: string) => config[key]),
    } as unknown as ConfigService;
  }

  function buildJob(data: SendEmailJob): Job<SendEmailJob> {
    return { id: 'job-42', data } as Job<SendEmailJob>;
  }

  beforeEach(() => {
    jest.clearAllMocks();

    logger = {
      log: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('with SMTP transport (development)', () => {
    beforeEach(() => {
      const configService = buildConfigService();
      processor = new EmailProcessor(configService, logger as never);
    });

    it('sends an email via the transporter', async () => {
      const job = buildJob({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>World</p>',
      });

      await processor.process(job);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Hello',
          html: '<p>World</p>',
        }),
      );
    });

    it('logs success after sending', async () => {
      const job = buildJob({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>World</p>',
      });

      await processor.process(job);

      expect(logger.log).toHaveBeenCalledWith(
        'Email sent successfully',
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Hello',
          jobId: 'job-42',
        }),
      );
    });

    it('re-throws on failure for BullMQ retry', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

      const job = buildJob({
        to: 'user@example.com',
        subject: 'Fail',
        html: '<p>Oops</p>',
      });

      await expect(processor.process(job)).rejects.toThrow('SMTP timeout');

      expect(logger.error).toHaveBeenCalledWith(
        'Email sending failed',
        expect.objectContaining({
          to: 'user@example.com',
          error: 'SMTP timeout',
        }),
      );
    });

    it('creates SMTP transport when SES region is not configured', () => {
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 1025,
          ignoreTLS: true,
        }),
      );
    });
  });

  describe('with SES transport (production)', () => {
    it('creates SES transport when SES region is configured', () => {
      const configService = buildConfigService({
        'aws.ses.region': 'us-east-1',
        'aws.ses.accessKeyId': 'AKIA_TEST',
        'aws.ses.secretAccessKey': 'secret_test',
      });

      processor = new EmailProcessor(configService, logger as never);

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          SES: expect.objectContaining({
            ses: expect.any(Object),
            aws: expect.objectContaining({
              SendRawEmailCommand: expect.any(Function),
            }),
          }),
        }),
      );
    });
  });
});
