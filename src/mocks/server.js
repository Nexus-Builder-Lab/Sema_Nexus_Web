import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// Usado pelos testes (Vitest, ambiente jsdom).
export const server = setupServer(...handlers);
