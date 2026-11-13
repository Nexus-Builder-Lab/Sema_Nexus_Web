import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

// O mapa Leaflet em jsdom é lento com a suíte completa em paralelo.
vi.setConfig({ testTimeout: 20000 });

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

const ROTA = '/intelligence/inteligencia-ambiental';
const FOCOS = 'Focos de calor — INPE (dados públicos)';
const DETER = 'Alertas de desmatamento — DETER (dados públicos)';

const GEO = {
  type: 'Feature',
  properties: { id: 5100250, nome: 'Alta Floresta' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-61, -18],
        [-50, -18],
        [-50, -8],
        [-61, -8],
        [-61, -18],
      ],
    ],
  },
};

const camadas = (container) => container.querySelector('.leaflet-control-layers');
const entrada = (container, nome) =>
  within(camadas(container)).getByText(nome).closest('label').querySelector('input');
const marcadores = (container) =>
  container.querySelectorAll('path.leaflet-interactive:not(.nx-malha-municipio)');

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={[ROTA]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Camada INPE no mapa de Inteligência ambiental', () => {
  beforeEach(() => {
    iniciarSessao();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => GEO })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lista as camadas INPE desligadas, ao lado de Demandas (fictícias), sem legenda', async () => {
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await waitFor(() => expect(camadas(container)).toBeTruthy(), { timeout: 5000 });
    expect(await within(camadas(container)).findByText(DETER)).toBeInTheDocument();
    expect(entrada(container, FOCOS)).not.toBeChecked();
    expect(entrada(container, /Demandas \(fictícias\)/)).toBeChecked();
    expect(screen.queryByRole('region', { name: 'Legenda da camada INPE' })).toBeNull();
  });

  it('liga e desliga os focos: mostra a atribuição com a data e adiciona marcadores', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await waitFor(() => expect(marcadores(container)).toHaveLength(4), { timeout: 5000 });
    await waitFor(() => expect(camadas(container)).toBeTruthy(), { timeout: 5000 });

    // O controle é reconstruído quando a camada DETER entra (metadados): espera antes de clicar.
    await within(camadas(container)).findByText(DETER, {}, { timeout: 5000 });
    await user.click(entrada(container, FOCOS));
    const legenda = await screen.findByRole('region', { name: 'Legenda da camada INPE' });
    expect(legenda).toHaveTextContent(
      'Fonte: INPE — dados públicos, não oficiais da SEMA. Atualizado em 09/11/2026',
    );
    await waitFor(() => expect(marcadores(container)).toHaveLength(4 + 8), { timeout: 5000 });

    await user.click(entrada(container, FOCOS));
    await waitFor(() => expect(marcadores(container)).toHaveLength(4), { timeout: 5000 });
    expect(screen.queryByRole('region', { name: 'Legenda da camada INPE' })).toBeNull();
    // As demandas fictícias não mudam.
    expect(screen.getByText('4 demandas no mapa')).toBeInTheDocument();
  });

  it('popup do foco traz data/hora, satélite, município, bioma e a fonte', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await waitFor(() => expect(camadas(container)).toBeTruthy(), { timeout: 5000 });
    // O controle é reconstruído quando a camada DETER entra (metadados): espera antes de clicar.
    await within(camadas(container)).findByText(DETER, {}, { timeout: 5000 });
    await user.click(entrada(container, FOCOS));
    await waitFor(() => expect(marcadores(container)).toHaveLength(4 + 8), { timeout: 5000 });
    // Os focos entram depois das demandas.
    fireEvent.click([...marcadores(container)].at(-1));
    const popup = await screen.findByText(/Satélite:/);
    const caixa = popup.closest('.leaflet-popup-content');
    expect(caixa).toHaveTextContent('Foco de calor');
    expect(caixa).toHaveTextContent(/UTC/);
    expect(caixa).toHaveTextContent('Fonte: INPE — dados públicos');
  });

  it('painel lateral mostra o total e o top 5, separados dos dados fictícios', async () => {
    renderPagina();
    const painel = await screen.findByRole('region', { name: 'Referência por satélite (INPE)' });
    expect(within(painel).getByText('Dados públicos reais — não fictícios')).toBeInTheDocument();
    expect(await within(painel).findByText('8')).toBeInTheDocument();
    const itens = within(painel).getAllByRole('listitem');
    expect(itens).toHaveLength(4);
    expect(itens[0]).toHaveTextContent('Alta Floresta — 4');
    expect(painel).toHaveTextContent('Atualizado em 09/11/2026');
    expect(painel).toHaveTextContent('Não entra nos indicadores fictícios');
  });

  it('modo agregado automático acima de 3.000 pontos usa o por-município e não busca pontos', async () => {
    const pontos = vi.fn();
    server.use(
      http.get('/api/intelligence/referencia/por-municipio', () =>
        HttpResponse.json({
          fonte: 'INPE — dados públicos',
          oficialSema: false,
          atualizadoEm: '2026-11-09T12:00:00',
          aviso: 'x',
          total: 3500,
          itens: [
            { municipioId: 5100250, municipio: 'Alta Floresta', bioma: 'AMAZONIA', total: 3500 },
          ],
        }),
      ),
      http.get('/api/intelligence/referencia/pontos', () => {
        pontos();
        return HttpResponse.json({ pontos: [] });
      }),
    );
    const user = userEvent.setup();
    const { container } = renderPagina();
    await waitFor(() => expect(camadas(container)).toBeTruthy(), { timeout: 5000 });
    await screen.findByText('3500');
    // O controle é reconstruído quando a camada DETER entra (metadados): espera antes de clicar.
    await within(camadas(container)).findByText(DETER, {}, { timeout: 5000 });
    await user.click(entrada(container, FOCOS));
    expect(await screen.findByText(/automático: muitos pontos/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Legenda da camada INPE' })).toHaveTextContent(
      'por município',
    );
    expect(pontos).not.toHaveBeenCalled();
  });

  it('sem DETER na API, a camada DETER não aparece', async () => {
    server.use(
      http.get('/api/intelligence/referencia/metadados', () =>
        HttpResponse.json({
          fonte: 'INPE — dados públicos',
          oficialSema: false,
          atualizadoEm: '2026-11-09T12:00:00',
          aviso: 'x',
          importacoes: [{ tipo: 'FOCO_CALOR', registros: 8 }],
        }),
      ),
    );
    const { container } = renderPagina();
    await waitFor(() => expect(camadas(container)).toBeTruthy(), { timeout: 5000 });
    expect(within(camadas(container)).getByText(FOCOS)).toBeInTheDocument();
    const painel = await screen.findByRole('region', { name: /Referência por satélite/ });
    await within(painel).findByText('8');
    expect(within(camadas(container)).queryByText(DETER)).toBeNull();
  });

  it('erro na referência mostra o estado de erro no painel sem derrubar o mapa', async () => {
    server.use(
      http.get('/api/intelligence/referencia/por-municipio', () =>
        HttpResponse.json({ title: 'Erro' }, { status: 500 }),
      ),
    );
    renderPagina();
    const painel = await screen.findByRole('region', { name: 'Referência por satélite (INPE)' });
    expect(await within(painel).findByRole('button', { name: /tentar novamente/i })).toBeVisible();
    expect(await screen.findByText('4 demandas no mapa')).toBeInTheDocument();
  });

  it('filtros de período do satélite não alteram a consulta das demandas fictícias', async () => {
    const user = userEvent.setup();
    const consultas = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      consultas.push(url.pathname + url.search);
    });
    renderPagina();
    await screen.findByText('4 demandas no mapa');
    await user.type(screen.getByLabelText('Satélite (INPE) de'), '2026-10-27');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    const painel = screen.getByRole('region', { name: 'Referência por satélite (INPE)' });
    await waitFor(() => expect(within(painel).getByText('4')).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(
      consultas.some((c) => c.includes('referencia/por-municipio?tipo=FOCO_CALOR&de=2026-10-27')),
    ).toBe(true);
    const mapa = consultas.filter((c) => c.startsWith('/api/intelligence/mapa'));
    expect(mapa.every((c) => !c.includes('satDe') && !c.includes('2026-10-27'))).toBe(true);
  });
});
