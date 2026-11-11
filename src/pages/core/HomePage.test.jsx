import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { dashboardMock } from '../../mocks/fixtures/intelligence.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import HomePage from './HomePage.jsx';

function renderPagina() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

const valorDoCard = (rotulo) =>
  screen
    .getByText(rotulo, { selector: '.nx-kpi-label' })
    .closest('.nx-kpi')
    .querySelector('.nx-kpi-value').textContent;

describe('HomePage (dashboard inicial)', () => {
  beforeEach(() => iniciarSessao());

  it('mostra os cinco indicadores vindos de /api/dashboard', async () => {
    renderPagina();
    const { resumo } = dashboardMock();
    await waitFor(() => expect(valorDoCard('Demandas totais')).toBe(String(resumo.totalDemandas)));
    expect(valorDoCard('Em andamento')).toBe(String(resumo.emAndamento));
    expect(valorDoCard('Finalizadas')).toBe(String(resumo.finalizadas));
    expect(valorDoCard('Atrasadas')).toBe(String(resumo.atrasadas));
    expect(valorDoCard('Documentos')).toBe(String(resumo.totalDocumentos));
    expect(screen.getAllByRole('button', { name: /^Sobre o indicador/ })).toHaveLength(5);
  });

  it('lista as atividades recentes com link para a demanda', async () => {
    renderPagina();
    const lista = await screen.findByRole('list');
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(dashboardMock().atividadesRecentes.length);
    expect(within(itens[0]).getByText('Conclusão')).toBeInTheDocument();
    expect(within(itens[0]).getByRole('link', { name: /DEM-2026\/0070/ })).toHaveAttribute(
      'href',
      '/flux/demandas/70',
    );
  });

  it('tem atalhos para os três módulos e o selo demonstrativo', async () => {
    renderPagina();
    expect(screen.getByRole('link', { name: /SEMA Intelligence/ })).toHaveAttribute(
      'href',
      '/intelligence',
    );
    expect(screen.getByRole('link', { name: /SEMA Flux/ })).toHaveAttribute(
      'href',
      '/flux/demandas',
    );
    expect(screen.getByRole('link', { name: /SEMA DocIA/ })).toHaveAttribute(
      'href',
      '/docia/documentos',
    );
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(valorDoCard('Demandas totais')).not.toBe('—'));
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
    await waitFor(() => expect(valorDoCard('Demandas totais')).not.toBe('—'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra carregamento inicial', () => {
    renderPagina();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
