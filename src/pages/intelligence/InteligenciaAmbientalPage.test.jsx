import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

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
const BANNER = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';

const GEO_UF = {
  type: 'Feature',
  properties: {},
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

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={[ROTA]}>
      <App />
    </MemoryRouter>,
  );
}

const marcadores = (container) =>
  container.querySelectorAll('path.leaflet-interactive:not(.nx-malha-municipio)');

describe('Inteligência ambiental (mapa)', () => {
  let chamadasGeo;

  beforeEach(() => {
    iniciarSessao();
    chamadasGeo = [];
    // A malha vem de /geo/*.geojson (arquivos locais): aqui é substituída por uma geometria mínima.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        chamadasGeo.push(String(url));
        const geo = String(url).includes('municipios')
          ? { ...GEO_UF, properties: { id: 5103403, nome: 'Cuiabá' } }
          : GEO_UF;
        return { ok: true, json: async () => geo };
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('mostra a aba no menu, o título e a faixa demonstrativa', async () => {
    renderPagina();
    const menu = screen.getByRole('navigation', { name: 'Módulos' });
    expect(within(menu).getByRole('link', { name: 'Inteligência ambiental' })).toHaveAttribute(
      'href',
      ROTA,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Inteligência ambiental' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('note', { name: /ambiente demonstrativo/i })).toHaveTextContent(BANNER);
    expect(await screen.findByText('4 demandas no mapa')).toBeInTheDocument();
  });

  it('usa a malha GeoJSON local e cita a fonte IBGE na legenda', async () => {
    renderPagina();
    await screen.findByText('4 demandas no mapa');
    await waitFor(() =>
      expect(chamadasGeo).toEqual(
        expect.arrayContaining(['/geo/mt-uf.geojson', '/geo/mt-municipios.geojson']),
      ),
    );
    const legenda = screen.getByRole('region', { name: 'Legenda do mapa' });
    expect(within(legenda).getByText(/IBGE/)).toBeInTheDocument();
    expect(within(legenda).getByText('Desmatamento ilegal')).toBeInTheDocument();
  });

  it('desenha um marcador por demanda e abre popup com link para a demanda', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await waitFor(() => expect(marcadores(container)).toHaveLength(4));

    await user.click(marcadores(container)[0]);
    const link = await screen.findByRole('link', { name: /Abrir demanda DEM-2026\/0010/ });
    expect(link).toHaveAttribute('href', '/flux/demandas/10');
    expect(screen.getByText('Status: Em andamento')).toBeInTheDocument();
  });

  it('tem controle de camadas com "Demandas (fictícias)" ligada e fundo OpenStreetMap desligado', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await waitFor(() => expect(container.querySelector('.leaflet-control-layers')).toBeTruthy());
    const camadas = container.querySelector('.leaflet-control-layers');
    const demandas = within(camadas).getByText(/Demandas \(fictícias\)/);
    expect(demandas.closest('label').querySelector('input')).toBeChecked();
    const fundo = screen.getByRole('button', { name: /Mapa de fundo OpenStreetMap/ });
    expect(fundo).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.leaflet-tile-pane img')).toBeNull();
    await user.click(fundo);
    expect(fundo).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(container.querySelector('.leaflet-tile-pane img')).toBeTruthy());
  });

  it('desligar o fundo OpenStreetMap não deixa o preenchimento da UF por cima das camadas (Web#103)', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await waitFor(() => expect(marcadores(container)).toHaveLength(4));
    const paneFundo = () => container.querySelector('.leaflet-nx-fundo-uf-pane');
    await waitFor(() => expect(paneFundo()?.querySelector('path')).toBeTruthy());
    expect(paneFundo().style.zIndex).toBe('350');

    const fundo = screen.getByRole('button', { name: /Mapa de fundo OpenStreetMap/ });
    await user.click(fundo); // liga
    await user.click(fundo); // desliga: o preenchimento opaco é recriado
    expect(fundo).toHaveAttribute('aria-pressed', 'false');

    await waitFor(() => expect(paneFundo().querySelectorAll('path')).toHaveLength(1));
    const overlay = container.querySelector('.leaflet-overlay-pane');
    // Nenhum polígono opaco da UF no overlayPane (onde ficaria acima de municípios e pontos).
    const opacos = [...overlay.querySelectorAll('path')].filter(
      (p) => p.getAttribute('fill-opacity') === '1',
    );
    expect(opacos).toHaveLength(0);
    expect(marcadores(container)).toHaveLength(4);
  });

  it('mostra o nome do município ao passar o mouse no modo Ocorrências (Web#105)', async () => {
    const { container } = renderPagina();
    await waitFor(() => expect(marcadores(container)).toHaveLength(4));
    const malha = await waitFor(() => {
      const el = container.querySelector('path.nx-malha-municipio.leaflet-interactive');
      expect(el).toBeTruthy();
      return el;
    });
    fireEvent.mouseOver(malha);
    const tip = await waitFor(() => {
      const el = container.querySelector('.leaflet-tooltip.mun-tip');
      expect(el).toBeTruthy();
      return el;
    });
    expect(tip).toHaveTextContent('Cuiabá');
  });

  it('visão de satélite fica desabilitada sem ESRI_API_KEY no servidor (Web#107)', async () => {
    renderPagina();
    await screen.findByText('4 demandas no mapa');
    const sat = screen.getByRole('button', { name: /Visão de satélite indisponível/ });
    expect(sat).toBeDisabled();
    expect(sat).toHaveAttribute('aria-pressed', 'false');
  });

  it('visão de satélite: desligada por padrão, liga pelo proxy /tiles/esri com atribuição Esri e alterna com o OpenStreetMap (Web#107)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url) === '/tiles/esri/status') return { ok: true, status: 204 };
        const geo = String(url).includes('municipios')
          ? { ...GEO_UF, properties: { id: 5103403, nome: 'Cuiabá' } }
          : GEO_UF;
        return { ok: true, status: 200, json: async () => geo };
      }),
    );
    const user = userEvent.setup();
    const { container } = renderPagina();
    await waitFor(() => expect(marcadores(container)).toHaveLength(4));
    const sat = await screen.findByRole('button', { name: 'Visão de satélite (requer internet)' });
    await waitFor(() => expect(sat).toBeEnabled());
    expect(sat).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.leaflet-tile-pane img')).toBeNull();

    await user.click(sat);
    expect(sat).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() =>
      expect(container.querySelector('.leaflet-tile-pane img')?.getAttribute('src')).toMatch(
        /^\/tiles\/esri\/\d+\/\d+\/\d+$/,
      ),
    );
    expect(container.querySelector('.leaflet-control-attribution')).toHaveTextContent(
      /Powered by Esri/,
    );
    expect(marcadores(container)).toHaveLength(4);

    // OpenStreetMap substitui o satélite (opções exclusivas).
    const osm = screen.getByRole('button', { name: /Mapa de fundo OpenStreetMap/ });
    await user.click(osm);
    expect(sat).toHaveAttribute('aria-pressed', 'false');
    expect(osm).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() =>
      expect(
        [...container.querySelectorAll('.leaflet-tile-pane img')].every((i) =>
          i.getAttribute('src').includes('openstreetmap'),
        ),
      ).toBe(true),
    );
  });

  it('após ligar/desligar o satélite os marcadores continuam acima da malha e clicáveis (Web#109)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url) === '/tiles/esri/status') return { ok: true, status: 204 };
        const geo = String(url).includes('municipios')
          ? { ...GEO_UF, properties: { id: 5103403, nome: 'Cuiabá' } }
          : GEO_UF;
        return { ok: true, status: 200, json: async () => geo };
      }),
    );
    const user = userEvent.setup();
    const { container } = renderPagina();
    await waitFor(() => expect(marcadores(container)).toHaveLength(4));
    const sat = await screen.findByRole('button', { name: 'Visão de satélite (requer internet)' });
    await waitFor(() => expect(sat).toBeEnabled());
    await user.click(sat); // liga: a malha é recriada com o estilo do satélite
    await user.click(sat); // desliga: recriada de novo

    const paneMalha = container.querySelector('.leaflet-nx-malha-pane');
    await waitFor(() => expect(paneMalha.querySelector('path.nx-malha-municipio')).toBeTruthy());
    expect(Number(paneMalha.style.zIndex)).toBeLessThan(400);
    const overlay = container.querySelector('.leaflet-overlay-pane');
    expect(overlay.querySelector('path.nx-malha-municipio')).toBeNull();
    expect(overlay.querySelectorAll('path.leaflet-interactive')).toHaveLength(4);

    await user.click(marcadores(container)[0]);
    expect(
      await screen.findByRole('link', { name: /Abrir demanda DEM-2026\/0010/ }),
    ).toBeInTheDocument();
  });

  it('envia os filtros à API e atualiza os marcadores; Limpar restaura', async () => {
    const user = userEvent.setup();
    const consultas = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/api/intelligence/mapa') consultas.push(url.search);
    });
    const { container } = renderPagina();
    await waitFor(() => expect(marcadores(container)).toHaveLength(4));
    await screen.findByRole('option', { name: 'Cerrado' });

    await user.selectOptions(screen.getByLabelText('Categoria'), 'QUEIMADA_INCENDIO');
    await user.selectOptions(screen.getByLabelText('Bioma'), 'AMAZONIA');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    expect(await screen.findByText('1 demanda no mapa')).toBeInTheDocument();
    await waitFor(() => expect(marcadores(container)).toHaveLength(1));
    expect(consultas.at(-1)).toContain('bioma=AMAZONIA');
    expect(consultas.at(-1)).toContain('categoria=QUEIMADA_INCENDIO');

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(await screen.findByText('4 demandas no mapa')).toBeInTheDocument();
    expect(consultas.at(-1)).toBe('');
  });

  it('filtra por período e município', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('4 demandas no mapa');
    await screen.findByRole('option', { name: 'Cuiabá' });

    await user.type(screen.getByLabelText('Recebidas de'), '2026-06-01');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText('2 demandas no mapa')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Município'), 'Rondonópolis');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText('1 demanda no mapa')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nenhum ponto atende aos filtros', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('4 demandas no mapa');
    await user.type(screen.getByLabelText('Recebidas de'), '2026-12-31');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText('Nenhuma demanda encontrada')).toBeInTheDocument();
  });

  it('mostra erro com nova tentativa quando a API falha', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/intelligence/mapa', () =>
        HttpResponse.json(
          { title: 'Erro', status: 500 },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    renderPagina();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os dados',
    );

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('4 demandas no mapa')).toBeInTheDocument();
  });
});
