import { z } from 'zod';

export const configValidationSchema = z
  .object({
    // App
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    SERVICE_PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).optional(),
    FEDERATION_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((val) => val === 'true'),
    JWT_SECRET: z.string().default(''),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Redis
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().default(''),

    // Audit
    AUDIT_RETENTION_DAYS: z.coerce.number().min(1).default(90),

    // Email - SMTP
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().default(1025),
    EMAIL_FROM_ADDRESS: z.string().default('noreply@constellation.local'),
    EMAIL_FROM_NAME: z.string().default('Constellation Service'),

    // Email - AWS SES
    AWS_SES_REGION: z.string().optional(),
    AWS_SES_ACCESS_KEY_ID: z.string().optional(),
    AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),

    // CORS
    FRONTEND_ORIGINS: z.string().optional().default(''),

    // OpenTelemetry
    OTEL_SERVICE_NAME: z.string().optional(),
    OTEL_SERVICE_NAMESPACE: z.string().optional(),
    OTEL_SERVICE_VERSION: z.string().optional(),
    DEPLOYMENT_ENVIRONMENT: z.string().optional(),
    OTLP_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    OTLP_AUTH_TOKEN: z.string().optional(),
    OTLP_HOST: z.string().optional(),
    OTLP_PORT: z.coerce.number().optional(),
    OTEL_SDK_DISABLED: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.JWT_SECRET || data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 32 characters in production.',
        });
      }

      if (!data.AWS_SES_REGION) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AWS_SES_REGION'],
          message: 'AWS_SES_REGION is required in production.',
        });
      }

      if (!data.FRONTEND_ORIGINS || data.FRONTEND_ORIGINS.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['FRONTEND_ORIGINS'],
          message:
            'FRONTEND_ORIGINS must contain at least one valid origin in production.',
        });
      } else {
        const origins = data.FRONTEND_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean);
        if (origins.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['FRONTEND_ORIGINS'],
            message:
              'FRONTEND_ORIGINS must contain at least one valid origin in production.',
          });
        }
        for (const origin of origins) {
          try {
            new URL(origin);
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['FRONTEND_ORIGINS'],
              message: `Invalid CORS origin URL: ${origin}`,
            });
          }
        }
      }

      if (data.LOG_LEVEL === 'debug' || data.LOG_LEVEL === 'verbose') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['LOG_LEVEL'],
          message:
            'LOG_LEVEL must be "info", "warn", or "error" in production.',
        });
      }
    }
  });

export type AppConfig = z.infer<typeof configValidationSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfig {
  const result = configValidationSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }
  return result.data;
}
