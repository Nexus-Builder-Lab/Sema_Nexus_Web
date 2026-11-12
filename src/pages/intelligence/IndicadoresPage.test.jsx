import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { resumoMock } from '../../mocks/fixtures/intelligence.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import IndicadoresPage from './IndicadoresPage.jsx';

vi.mock('react-chartjs-2', () => {
  const stub = (tipo) =>
    function Grafico({ data, 'aria-label': ariaLabel }) {
      return (
        <div data-testid={`grafico-${tipo}`} role="img" aria-label={ariaLabel}>
          {JSON.stringify(data.labels)}
        </div>
      );
    };
  return { Bar: stub('bar'), Line: stub('line'), Doughnut: stub('doughnut') };
});

const renderPagina = () =>
  render(
    <MemoryRouter>
      <IndicadoresPage />
    </MemoryRouter>,
  );

describe('IndicadoresPage', () => {
  beforeEach(() => iniciarSessao());

  it('todo indicador tem descrição e "Como é calculado"', async () => {
    renderPagina();
    await screen.findByRole('img', { name: /evolução mensal/i });
    expect(screen.getAllByText(/Como é calculado:/)).toHaveLength(6);
    for (const nome of [
      'Demandas recebidas',
      'Tempo médio de atendimento (simulado)',
      'Percentual de conclusão',
      'Evolução por período',
      'Volume por categoria',
      'Distribuição territorial',
    ]) {
      expect(screen.getByRole('region', { name: nome })).toBeInTheDocument();
    }
  });

  it('calcula o percentual de conclusão e identifica dados fictícios', async () => {
    renderPagina();
    const r = resumoMock();
    const esperado = `${((r.finalizadas / r.totalDemandas) * 100).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })}%`;
    await waitFor(() => expect(screen.getByText(esperado)).toBeInTheDocument());
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThan(1);
    expect(screen.getByText(/pendência de contrato/i)).toBeInTheDocument();
  });

  it('mostra erro com nova tentativa quando a API falha', async () => {
    server.use(
      http.get('/api/intelligence/resumo', () =>
        HttpResponse.json(
          { title: 'Erro interno', status: 500, detail: 'falhou' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    renderPagina();
    expect(await screen.findByRole('alert')).toHaveTextContent(/falhou/i);
  });
});
