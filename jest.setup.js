/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NODE_ENV = 'test';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    callSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    recordingSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    milestone: {
      findMany: jest.fn(),
    },
    milestoneResponse: {
      findMany: jest.fn(),
    },
    objectionResponse: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    aIAnalysis: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Mock Zoom config
jest.mock('@/lib/config/zoom', () => ({
  isZoomConfigured: jest.fn(() => true),
  getZoomConfig: jest.fn(() => ({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    accountId: 'test-account-id',
  })),
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
