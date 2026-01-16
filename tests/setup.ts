import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock server-only package for tests
// This package throws an error when imported from client code,
// but tests run in Node.js (server environment)
vi.mock('server-only', () => ({}));

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
