// E2E Test Setup
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/constellation_test';

// Increase timeout for e2e tests
jest.setTimeout(30000);