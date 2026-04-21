import { EmailService } from './email.service';
import { SendEmailJob } from './types/send-email-job.types';

describe('EmailService', () => {
  let service: EmailService;
  let mockQueue: { add: jest.Mock };
  let logger: { debug: jest.Mock };

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    logger = {
      debug: jest.fn(),
    };

    service = new EmailService(mockQueue as never, logger as never);
  });

  it('enqueues an email job to the email-sending queue', async () => {
    const email: SendEmailJob = {
      to: 'user@example.com',
      subject: 'Welcome',
      html: '<p>Hello</p>',
    };

    await service.send(email);

    expect(mockQueue.add).toHaveBeenCalledWith('send-email', email, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  });

  it('enqueues an email with optional text field', async () => {
    const email: SendEmailJob = {
      to: 'user@example.com',
      subject: 'Welcome',
      html: '<p>Hello</p>',
      text: 'Hello',
    };

    await service.send(email);

    expect(mockQueue.add).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ text: 'Hello' }),
      expect.any(Object),
    );
  });

  it('logs a debug message after enqueuing', async () => {
    const email: SendEmailJob = {
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    };

    await service.send(email);

    expect(logger.debug).toHaveBeenCalledWith(
      'Email enqueued',
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test Subject',
      }),
    );
  });
});
