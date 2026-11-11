import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import httpClient from '../../api/httpClient.js';
import { listarTodasDemandasMock } from '../../mocks/fixtures/demandas.js';
import { iniciarSessao } from '../../test/auth.js';
import IntelligenceDashboardPage from './IntelligenceDashboardPage.jsx';

vi.mock('react-chartjs-2', () => {
  const stub = (tipo) =>
    function Grafico({ data, 'aria-label': ariaLabel }) {
      return (
        <div data-testid={`grafico-${tipo}`} role="img" aria-label={ariaLabel}>
          {JSON.stringify({ labels: data.labels, series: data.datasets.map((d) => d.data) })}
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

async function lerDashboard() {
  const { unmount } = render(
    <MemoryRouter initialEntries={['/intelligence']}>
      <IntelligenceDashboardPage />
    </MemoryRouter>,
  );
  await waitFor(() => expect(valorDoCard('Total de demandas')).not.toBe('—'));
  const numeros = {
    total: valorDoCard('Total de demandas'),
    concluidas: valorDoCard('Concluídas'),
    emFiscalizacao: valorDoCard('Em fiscalização'),
  };
  unmount();
  return numeros;
}

describe('Dashboard x Flux (indicadores derivam das demandas)', () => {
  beforeEach(() => iniciarSessao());

  it('ao finalizar uma demanda no Flux, os números do dashboard mudam', async () => {
    const antes = await lerDashboard();

    const demanda = listarTodasDemandasMock().find((d) => d.status === 'AGUARDANDO_CONCLUSAO');
    const { data } = await httpClient.post(`/demandas/${demanda.id}/conclusao`, {
      resultadoFinal: 'Irregularidade sanada (fictício).',
      justificativa: 'Fiscalização concluída.',
    });
    expect(data.status).toBe('FINALIZADA');

    const depois = await lerDashboard();
    expect(Number(depois.concluidas)).toBe(Number(antes.concluidas) + 1);
    expect(depois.total).toBe(antes.total);
    expect(depois.concluidas).not.toBe(antes.concluidas);
  });
});
