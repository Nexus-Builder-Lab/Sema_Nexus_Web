import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import AuthProvider from '../../auth/AuthProvider.jsx';
import { dashboardMock } from '../../mocks/fixtures/intelligence.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import { vi } from 'vitest';
import HomePage from './HomePage.jsx';

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

function renderPagina() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

const valorDoCard = (rotulo) =>
  screen
    .getByText(rotulo, { selector: '.nx-kpi-label' })
    .closest('.nx-kpi')
    .querySelector('.nx-kpi-value').textContent;

describe('HomePage (dashboard inicial)', () => {
  beforeEach(() => iniciarSessao());

  it('mostra saudação, ações e os 8 indicadores vindos da API', async () => {
    renderPagina();
    const { resumo } = dashboardMock();
    expect(
      screen.getByRole('heading', { level: 1, name: /^(Bom dia|Boa tarde|Boa noite)/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Relatórios/ })).toHaveAttribute(
      'href',
      '/intelligence/relatorios',
    );
    expect(screen.getByRole('link', { name: /Nova demanda/ })).toHaveAttribute(
      'href',
      '/flux/demandas/nova',
    );
    await waitFor(() =>
      expect(valorDoCard('Total de demandas')).toBe(String(resumo.totalDemandas)),
    );
    expect(valorDoCard('Concluídas')).toBe(String(resumo.finalizadas));
    expect(valorDoCard('Atrasadas')).toBe(String(resumo.atrasadas));
    expect(valorDoCard('Documentos cadastrados')).toBe(String(resumo.totalDocumentos));
    await waitFor(() => expect(valorDoCard('Municípios atendidos')).not.toBe('—'));
    await waitFor(() => expect(valorDoCard('Demandas georreferenciadas')).not.toBe('—'));
    expect(screen.getAllByRole('button', { name: /^Sobre o indicador/ })).toHaveLength(8);
    expect(screen.getByText(/vencem nos próximos 5 dias/)).toBeInTheDocument();
  });

  it('mostra os gráficos e as listas de atenção e atividades', async () => {
    renderPagina();
    expect(
      await screen.findByRole('heading', { name: 'Evolução mensal das atividades' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Demandas por situação').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('grafico-doughnut')).toHaveLength(1);
    expect(
      await screen.findByRole('heading', { name: 'Municípios com mais demandas' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Demandas ativas por setor' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /DEM-2026\/0031/ })).toHaveAttribute(
      'href',
      '/flux/demandas/31',
    );
    expect(await screen.findByRole('link', { name: /DEM-2026\/0070/ })).toHaveAttribute(
      'href',
      '/flux/demandas/70',
    );
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThanOrEqual(4);
  });

  it('mostra estado vazio sem demandas críticas', async () => {
    server.use(
      http.get('/api/flux/prazos', () =>
        HttpResponse.json({ content: [], page: 0, size: 7, totalElements: 0, totalPages: 0 }),
      ),
    );
    renderPagina();
    expect(await screen.findByText('Nenhuma demanda crítica')).toBeInTheDocument();
  });

  it('mostra estado vazio sem atividades', async () => {
    server.use(
      http.get('/api/dashboard', () =>
        HttpResponse.json({ ...dashboardMock(), atividadesRecentes: [] }),
      ),
    );
    renderPagina();
    expect(await screen.findByText('Nenhuma atividade recente')).toBeInTheDocument();
  });

  it('mostra erro com "Tentar novamente"', async () => {
    const user = userEvent.setup();
    let falhar = true;
    server.use(
      http.get('/api/dashboard', () =>
        falhar
          ? HttpResponse.json(
              { title: 'Erro', status: 500, detail: 'Indisponível no momento.' },
              { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
            )
          : HttpResponse.json(dashboardMock()),
      ),
    );
    renderPagina();
    const alertas = await screen.findAllByRole('alert');
    expect(alertas[0]).toHaveTextContent(/indisponível no momento/i);
    falhar = false;
    await user.click(screen.getAllByRole('button', { name: 'Tentar novamente' })[0]);
    await waitFor(() => expect(valorDoCard('Total de demandas')).not.toBe('—'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra carregamento inicial', () => {
    renderPagina();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});

describe('HomePage — painel Sentinela por perfil', () => {
  it('ADMIN vê o painel', async () => {
    iniciarSessao();
    renderPagina();
    expect(await screen.findByTestId('sentinela-painel')).toBeInTheDocument();
  });

  it('CONSULTA não vê o painel', async () => {
    const consulta = { id: 9, nome: 'Consulta Demo', email: 'c@demo', perfil: 'CONSULTA' };
    server.use(http.get('/api/auth/me', () => HttpResponse.json(consulta)));
    iniciarSessao(consulta);
    renderPagina();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByTestId('sentinela-painel')).not.toBeInTheDocument();
  });
});
