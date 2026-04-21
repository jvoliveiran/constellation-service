import { validateConfig, configValidationSchema } from './config.validation';

const validEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://localhost:5432/testdb',
};

const validProductionEnv = {
  ...validEnv,
  NODE_ENV: 'production',
  JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-characters',
  FRONTEND_ORIGINS: 'https://app.example.com',
  AWS_SES_REGION: 'us-east-1',
};

describe('validateConfig', () => {
  describe('when environment is valid', () => {
    it('applies defaults for optional fields', () => {
      const result = validateConfig({ ...validEnv });

      expect(result.NODE_ENV).toBe('development');
      expect(result.SERVICE_PORT).toBe(3000);
      expect(result.REDIS_HOST).toBe('localhost');
      expect(result.REDIS_PORT).toBe(6379);
      expect(result.REDIS_PASSWORD).toBe('');
      expect(result.FRONTEND_ORIGINS).toBe('');
    });

    it('accepts overridden values', () => {
      const result = validateConfig({
        ...validEnv,
        SERVICE_PORT: '8080',
        REDIS_HOST: 'redis.internal',
        REDIS_PORT: '6380',
        LOG_LEVEL: 'warn',
      });

      expect(result.SERVICE_PORT).toBe(8080);
      expect(result.REDIS_HOST).toBe('redis.internal');
      expect(result.REDIS_PORT).toBe(6380);
      expect(result.LOG_LEVEL).toBe('warn');
    });

    it('coerces string port values to numbers', () => {
      const result = validateConfig({
        ...validEnv,
        SERVICE_PORT: '4000',
        REDIS_PORT: '6380',
        OTLP_PORT: '4318',
      });

      expect(result.SERVICE_PORT).toBe(4000);
      expect(result.REDIS_PORT).toBe(6380);
      expect(result.OTLP_PORT).toBe(4318);
    });

    it('accepts all valid NODE_ENV values', () => {
      for (const env of ['development', 'production', 'test']) {
        const config = {
          ...validEnv,
          NODE_ENV: env,
          ...(env === 'production'
            ? {
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-characters',
                FRONTEND_ORIGINS: 'https://app.example.com',
                AWS_SES_REGION: 'us-east-1',
              }
            : {}),
        };
        const result = validateConfig(config);
        expect(result.NODE_ENV).toBe(env);
      }
    });

    it('accepts all valid LOG_LEVEL values', () => {
      for (const level of ['error', 'warn', 'info', 'debug', 'verbose']) {
        const result = validateConfig({ ...validEnv, LOG_LEVEL: level });
        expect(result.LOG_LEVEL).toBe(level);
      }
    });
  });

  describe('when DATABASE_URL is missing', () => {
    it('throws a validation error', () => {
      expect(() => validateConfig({ NODE_ENV: 'development' })).toThrow(
        'DATABASE_URL',
      );
    });
  });

  describe('when NODE_ENV is invalid', () => {
    it('throws a validation error', () => {
      expect(() =>
        validateConfig({ ...validEnv, NODE_ENV: 'staging' }),
      ).toThrow();
    });
  });

  describe('when NODE_ENV is production', () => {
    it('passes with all required production fields', () => {
      const result = validateConfig({
        ...validProductionEnv,
        FRONTEND_ORIGINS: 'https://app.example.com,https://admin.example.com',
      });

      expect(result.FRONTEND_ORIGINS).toBe(
        'https://app.example.com,https://admin.example.com',
      );
    });

    it('throws when JWT_SECRET is missing', () => {
      expect(() =>
        validateConfig({
          ...validProductionEnv,
          JWT_SECRET: '',
        }),
      ).toThrow('JWT_SECRET must be at least 32 characters in production');
    });

    it('throws when JWT_SECRET is shorter than 32 characters', () => {
      expect(() =>
        validateConfig({
          ...validProductionEnv,
          JWT_SECRET: 'short-secret',
        }),
      ).toThrow('JWT_SECRET must be at least 32 characters in production');
    });

    it('throws when FRONTEND_ORIGINS is missing', () => {
      expect(() =>
        validateConfig({
          ...validProductionEnv,
          FRONTEND_ORIGINS: '',
        }),
      ).toThrow('FRONTEND_ORIGINS must contain at least one valid origin');
    });

    it('throws when FRONTEND_ORIGINS is empty after trimming', () => {
      expect(() =>
        validateConfig({
          ...validProductionEnv,
          FRONTEND_ORIGINS: '  ,  , ',
        }),
      ).toThrow('FRONTEND_ORIGINS must contain at least one valid origin');
    });

    it('throws when FRONTEND_ORIGINS contains an invalid URL', () => {
      expect(() =>
        validateConfig({
          ...validProductionEnv,
          FRONTEND_ORIGINS: 'https://valid.com,not-a-url',
        }),
      ).toThrow('Invalid CORS origin URL: not-a-url');
    });

    it('throws when LOG_LEVEL is debug in production', () => {
      expect(() =>
        validateConfig({
          ...validProductionEnv,
          LOG_LEVEL: 'debug',
        }),
      ).toThrow('LOG_LEVEL must be "info", "warn", or "error" in production');
    });

    it('throws when LOG_LEVEL is verbose in production', () => {
      expect(() =>
        validateConfig({
          ...validProductionEnv,
          LOG_LEVEL: 'verbose',
        }),
      ).toThrow('LOG_LEVEL must be "info", "warn", or "error" in production');
    });

    it('accepts LOG_LEVEL info in production', () => {
      const result = validateConfig({
        ...validProductionEnv,
        LOG_LEVEL: 'info',
      });
      expect(result.LOG_LEVEL).toBe('info');
    });
  });

  describe('dev and test environments bypass production rules', () => {
    it('allows short JWT_SECRET in development', () => {
      const result = validateConfig({
        ...validEnv,
        JWT_SECRET: 'short',
      });
      expect(result.JWT_SECRET).toBe('short');
    });

    it('allows debug LOG_LEVEL in development', () => {
      const result = validateConfig({
        ...validEnv,
        LOG_LEVEL: 'debug',
      });
      expect(result.LOG_LEVEL).toBe('debug');
    });

    it('allows empty FRONTEND_ORIGINS in test', () => {
      const result = validateConfig({
        ...validEnv,
        NODE_ENV: 'test',
        FRONTEND_ORIGINS: '',
      });
      expect(result.FRONTEND_ORIGINS).toBe('');
    });
  });

  describe('when OpenTelemetry fields are provided', () => {
    it('passes through optional OTEL values', () => {
      const result = validateConfig({
        ...validEnv,
        OTEL_SERVICE_NAME: 'my-service',
        OTEL_SERVICE_NAMESPACE: 'my-namespace',
        OTEL_SERVICE_VERSION: '2.0.0',
        DEPLOYMENT_ENVIRONMENT: 'staging',
        OTLP_ENDPOINT: 'https://otel.example.com',
        OTEL_SDK_DISABLED: 'true',
      });

      expect(result.OTEL_SERVICE_NAME).toBe('my-service');
      expect(result.OTEL_SERVICE_NAMESPACE).toBe('my-namespace');
      expect(result.OTEL_SERVICE_VERSION).toBe('2.0.0');
      expect(result.DEPLOYMENT_ENVIRONMENT).toBe('staging');
      expect(result.OTLP_ENDPOINT).toBe('https://otel.example.com');
      expect(result.OTEL_SDK_DISABLED).toBe('true');
    });
  });
});

describe('configValidationSchema type inference', () => {
  it('exports AppConfig type that matches schema shape', () => {
    const result = configValidationSchema.parse({
      ...validEnv,
    });

    // Verify the parsed result has the expected typed fields
    const nodeEnv: 'development' | 'production' | 'test' = result.NODE_ENV;
    const port: number = result.SERVICE_PORT;
    const dbUrl: string = result.DATABASE_URL;

    expect(nodeEnv).toBe('development');
    expect(port).toBe(3000);
    expect(dbUrl).toBe('postgresql://localhost:5432/testdb');
  });
});
