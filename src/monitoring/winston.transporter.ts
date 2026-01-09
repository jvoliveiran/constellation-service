import { SeverityNumber } from '@opentelemetry/api-logs';
import TransportStream = require('winston-transport');

export class OpenTelemetryTransport extends TransportStream {
  private loggerProvider: any;

  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts);
  }

  setLoggerProvider(provider: any) {
    this.loggerProvider = provider;
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (this.loggerProvider) {
      const logger = this.loggerProvider.getLogger('winston');
      const severityNumber = this.mapLevelToSeverity(info.level);

      logger.emit({
        severityNumber,
        severityText: info.level.toUpperCase(),
        body: info.message,
        attributes: {
          'log.level': info.level,
          ...info.metadata,
        },
      });
    }

    callback();
  }

  private mapLevelToSeverity(level: string): SeverityNumber {
    const levelMap: Record<string, SeverityNumber> = {
      error: SeverityNumber.ERROR,
      warn: SeverityNumber.WARN,
      info: SeverityNumber.INFO,
      debug: SeverityNumber.DEBUG,
      verbose: SeverityNumber.TRACE,
      silly: SeverityNumber.TRACE,
    };
    return levelMap[level] || SeverityNumber.INFO;
  }
}
