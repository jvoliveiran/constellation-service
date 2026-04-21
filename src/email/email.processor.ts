import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import { Transporter, TransportOptions } from 'nodemailer';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SendEmailJob } from './types/send-email-job.types';

@Processor('email-sending')
export class EmailProcessor extends WorkerHost {
  private readonly transporter: Transporter;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {
    super();
    this.transporter = this.createTransporter();
  }

  async process(job: Job<SendEmailJob>): Promise<void> {
    const { to, subject, html, text } = job.data;

    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get<string>('email.fromName')}" <${this.configService.get<string>('email.fromAddress')}>`,
        to,
        subject,
        html,
        text,
      });

      this.logger.log('Email sent successfully', {
        to,
        subject,
        jobId: job.id,
        context: EmailProcessor.name,
      });
    } catch (error: unknown) {
      this.logger.error('Email sending failed', {
        to,
        subject,
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        context: EmailProcessor.name,
      });
      throw error;
    }
  }

  private createTransporter(): Transporter {
    const sesRegion = this.configService.get<string>('aws.ses.region');

    if (sesRegion) {
      const ses = new SESClient({
        region: sesRegion,
        credentials: {
          accessKeyId:
            this.configService.get<string>('aws.ses.accessKeyId') ?? '',
          secretAccessKey:
            this.configService.get<string>('aws.ses.secretAccessKey') ?? '',
        },
      });

      // @types/nodemailer does not include SES transport types — runtime API is stable
      return nodemailer.createTransport({
        SES: { ses, aws: { SendRawEmailCommand } },
      } as unknown as TransportOptions);
    }

    return nodemailer.createTransport({
      host: this.configService.get<string>('email.smtpHost'),
      port: this.configService.get<number>('email.smtpPort'),
      ignoreTLS: true,
    });
  }
}
