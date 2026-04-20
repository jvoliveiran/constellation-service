import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Disable OpenTelemetry in tests
process.env.OTEL_SDK_DISABLED = 'true';

// Increase timeout for E2E tests
jest.setTimeout(30000);
