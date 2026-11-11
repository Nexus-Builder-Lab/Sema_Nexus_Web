import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { resumoMock } from '../../mocks/fixtures/intelligence.js';
import { iniciarSessao } from '../../test/auth.js';
import PainelFiscalizacaoPage from './PainelFiscalizacaoPage.jsx';

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

const valorDoCard = (rotulo) =>
  screen
    .getByText(rotulo, { selector: '.nx-kpi-label' })
    .closest('.nx-kpi')
    .querySelector('.nx-kpi-value').textContent;

describe('PainelFiscalizacaoPage', () => {
  beforeEach(() => iniciarSessao());

  it('mostra contadores por status, incluindo atrasadas', async () => {
    render(
      <MemoryRouter>
        <PainelFiscalizacaoPage />
      </MemoryRouter>,
    );
    const r = resumoMock();
    await waitFor(() => expect(valorDoCard('Total')).toBe(r.totalDemandas.toLocaleString('pt-BR')));
    expect(valorDoCard('Atrasadas')).toBe(String(r.atrasadas));
    expect(valorDoCard('Pendentes')).toBe(String(r.pendentes));
    expect(valorDoCard('Em andamento')).toBe(String(r.emAndamento));
    expect(valorDoCard('Finalizadas')).toBe(String(r.finalizadas));
  });

  it('mostra gráficos por situação, período, município, categoria e equipe', async () => {
    render(
      <MemoryRouter>
        <PainelFiscalizacaoPage />
      </MemoryRouter>,
    );
    for (const nome of [
      /por situação/i,
      /por período/i,
      /por município/i,
      /por categoria/i,
      /por equipe/i,
    ]) {
      expect(await screen.findByRole('img', { name: nome })).toBeInTheDocument();
    }
    const equipe = within(screen.getByRole('region', { name: 'Por equipe' }));
    expect(equipe.getByRole('img').textContent).toMatch(/Equipe|Sem equipe/);
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThan(1);
  });
});
