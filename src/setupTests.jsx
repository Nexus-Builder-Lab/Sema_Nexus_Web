import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { clearSession } from './auth/sessionStore.js';
import { resetAdminMock } from './mocks/fixtures/admin.js';
import { resetDemandasMock } from './mocks/fixtures/demandas.js';
import { resetNotificacoesMock } from './mocks/fixtures/notificacoes.js';
import { server } from './mocks/server.js';

// jsdom não tem canvas: os gráficos viram um marcador (testes de gráfico declaram o próprio mock).
vi.mock('react-chartjs-2', () => {
  const stub = (tipo) =>
    function Grafico({ data, 'aria-label': ariaLabel }) {
      return (
        <div data-testid={`grafico-${tipo}`} role="img" aria-label={ariaLabel}>
          {JSON.stringify(data?.labels)}
        </div>
      );
    };
  return { Bar: stub('bar'), Line: stub('line'), Doughnut: stub('doughnut') };
});

// API simulada pelos mesmos handlers MSW gerados do contrato OpenAPI.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  clearSession();
  resetDemandasMock();
  resetAdminMock();
  resetNotificacoesMock();
  // Alguns testes rodam em ambiente node (sem DOM).
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
});

afterAll(() => server.close());
