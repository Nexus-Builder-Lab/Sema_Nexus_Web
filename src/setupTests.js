import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { clearSession } from './auth/sessionStore.js';
import { server } from './mocks/server.js';

// API simulada pelos mesmos handlers MSW gerados do contrato OpenAPI.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  clearSession();
  // Alguns testes rodam em ambiente node (sem DOM).
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
});

afterAll(() => server.close());
