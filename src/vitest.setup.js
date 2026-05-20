import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock base44 SDK
vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: vi.fn(),
      isAuthenticated: vi.fn(),
      logout: vi.fn(),
      redirectToLogin: vi.fn(),
      updateMe: vi.fn(),
    },
    entities: {
      Client: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        filter: vi.fn(),
      },
      Sale: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      Tenant: {
        list: vi.fn(),
        get: vi.fn(),
      },
    },
    functions: {
      invoke: vi.fn(),
    },
    integrations: {
      Core: {
        SendEmail: vi.fn(),
      },
    },
  },
}));