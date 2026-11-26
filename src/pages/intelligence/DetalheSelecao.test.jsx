import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../App.jsx';
import { MUNICIPIOS } from '../../mocks/fixtures/catalogos.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../test/auth.js';
import { PANE_SELECAO } from './mapaConfig.js';
import {
  formatarHectares,
  formatarKm2,
  geometriaDaSelecao,
  limitesDaGeometria,
} from './selecaoMapa.js';

// O mapa Leaflet em jsdom é lento com a suíte completa em paralelo.
vi.setConfig({ testTimeout: 20000 });

vi.mock('react-chartjs-2', () => {
  const stub = () =>
    function Grafico() {
      return <div />;
    };
  return { Bar: stub(), Line: stub(), Doughnut: stub() };
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
const paneSelecao = (container) => container.querySelector(`.leaflet-${PANE_SELECAO}-pane`);
const painel = () => screen.findByRole('region', { name: 'Detalhes da seleção no mapa' });

function LocalAtual() {
  const loc = useLocation();
  return <span data-testid="rota-atual">{`${loc.pathname}${loc.search}`}</span>;
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={[ROTA]}>
      <App />
      <LocalAtual />
    </MemoryRouter>,
  );
}

async function ligar(container, user, nome) {
  await waitFor(() => expect(camadas(container)).toBeTruthy(), { timeout: 5000 });
  // O controle é reconstruído quando a camada DETER entra (metadados): espera antes de clicar.
  await within(camadas(container)).findByText(DETER, {}, { timeout: 5000 });
  await user.click(entrada(container, nome));
}

describe('Seleção no mapa: área afetada e painel de detalhes', () => {
  beforeEach(() => {
    iniciarSessao();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => GEO })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('alerta DETER: desenha o polígono da fonte e mostra a área em ha e km², identificada como INPE', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await ligar(container, user, DETER);
    await waitFor(() => expect(marcadores(container)).toHaveLength(4 + 2), { timeout: 5000 });

    fireEvent.click([...marcadores(container)].at(-2));

    const caixa = await painel();
    expect(
      within(caixa).getByRole('heading', { name: 'Alerta de desmatamento (DETER)' }),
    ).toBeInTheDocument();
    expect(within(caixa).getByText('INPE — dados públicos reais')).toBeInTheDocument();
    expect(await within(caixa).findByText(/^(42,00|18,00) ha$/)).toBeInTheDocument();
    expect(caixa).toHaveTextContent(/0,(42|18) km²/);
    expect(caixa).toHaveTextContent('areamunkm');
    expect(within(caixa).getByLabelText('Atributos da fonte')).toHaveTextContent('Classe');
    expect(caixa).toHaveTextContent('não oficiais da SEMA');
    await waitFor(() =>
      expect(paneSelecao(container).querySelector('.nx-selecao-area')).toBeTruthy(),
    );
    expect(paneSelecao(container).querySelector('.nx-selecao-ponto')).toBeTruthy();
    // O destaque não é interativo: os marcadores continuam clicáveis.
    expect(marcadores(container)).toHaveLength(4 + 2);
  });

  it('foco de calor: só o ponto é destacado e a área aparece como não informada pela fonte', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await ligar(container, user, FOCOS);
    await waitFor(() => expect(marcadores(container)).toHaveLength(4 + 8), { timeout: 5000 });

    fireEvent.click([...marcadores(container)].at(-1));

    const caixa = await painel();
    expect(within(caixa).getByRole('heading', { name: 'Foco de calor' })).toBeInTheDocument();
    expect(await within(caixa).findByText(/não informada pela fonte/)).toBeInTheDocument();
    expect(caixa).toHaveTextContent('foco de calor como ponto');
    expect(within(caixa).getByLabelText('Atributos da fonte')).toHaveTextContent(
      'FRP — potência radiativa do fogo (MW)',
    );
    expect(caixa).not.toHaveTextContent(/\d ha\b/);
    expect(paneSelecao(container).querySelector('.nx-selecao-ponto')).toBeTruthy();
    expect(paneSelecao(container).querySelector('.nx-selecao-area')).toBeNull();
  });

  it('demanda fictícia: polígono e todos os dados, marcada como demonstrativa; fechar remove o destaque', async () => {
    const user = userEvent.setup();
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await waitFor(() => expect(marcadores(container)).toHaveLength(4), { timeout: 5000 });

    fireEvent.click(marcadores(container)[0]);

    const caixa = await painel();
    expect(
      within(caixa).getByRole('heading', { name: 'Demanda de fiscalização' }),
    ).toBeInTheDocument();
    expect(within(caixa).getByText('AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS')).toBeInTheDocument();
    expect(await within(caixa).findByText('42,35 ha')).toBeInTheDocument();
    expect(caixa).toHaveTextContent('Polígono fictício');
    expect(caixa).toHaveTextContent('DEM-2026/0010');
    expect(
      within(caixa).getByRole('link', { name: 'Ver a demanda completa no Flux' }),
    ).toHaveAttribute('href', '/flux/demandas/10');
    await waitFor(() =>
      expect(paneSelecao(container).querySelector('.nx-selecao-area')).toBeTruthy(),
    );

    await user.click(within(caixa).getByRole('button', { name: 'Fechar detalhes da seleção' }));
    expect(screen.queryByRole('region', { name: 'Detalhes da seleção no mapa' })).toBeNull();
    expect(paneSelecao(container).querySelector('.nx-selecao-area')).toBeNull();
  });

  it('demanda fora do escopo do perfil (403 da API): avisa sem mostrar dados nem polígono', async () => {
    server.use(
      http.get('/api/demandas/:id', () =>
        HttpResponse.json(
          { title: 'Acesso negado', status: 403, detail: 'Demanda fora do escopo do fiscal.' },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await waitFor(() => expect(marcadores(container)).toHaveLength(4), { timeout: 5000 });

    fireEvent.click(marcadores(container)[0]);

    const caixa = await painel();
    expect(await within(caixa).findByRole('alert')).toHaveTextContent(
      'Seu perfil não tem acesso aos detalhes desta demanda (DEM-2026/0010)',
    );
    expect(caixa).not.toHaveTextContent(/ha$/);
    expect(paneSelecao(container).querySelector('.nx-selecao-area')).toBeNull();
  });

  it('botão "Criar Demanda de Monitoramento": abre cadastro pré-preenchido a partir de DETER (com polígono e área)', async () => {
    server.use(
      http.get('/api/catalogos/municipios', () =>
        HttpResponse.json([
          ...MUNICIPIOS,
          {
            id: 5100250,
            nome: 'Alta Floresta',
            regiao: 'Norte',
            bioma: 'AMAZONIA',
            latitude: -9.876,
            longitude: -56.086,
          },
        ]),
      ),
    );
    const user = userEvent.setup();
    const { container } = renderPagina();
    await screen.findByText('4 demandas no mapa');
    await ligar(container, user, DETER);
    await waitFor(() => expect(marcadores(container)).toHaveLength(4 + 2), { timeout: 5000 });

    fireEvent.click([...marcadores(container)].at(-2));
    const caixa = await painel();
    const criar = await within(caixa).findByRole('link', {
      name: 'Criar Demanda de Monitoramento',
    });

    await user.click(criar);
    await screen.findByRole('form', { name: 'Dados da demanda' });
    expect(screen.getByTestId('rota-atual')).toHaveTextContent('/flux/demandas/nova');
    expect(screen.getByLabelText(/^Origem/)).toHaveValue('MONITORAMENTO');
    expect(screen.getByLabelText(/^Município/)).toHaveValue('Alta Floresta');
    expect(screen.getByLabelText(/^Categoria/)).toHaveValue('DESMATAMENTO_ILEGAL');
    expect(screen.getByLabelText(/^Latitude/)).toHaveValue('-9.8');
    expect(screen.getByLabelText(/^Longitude/)).toHaveValue('-56.3');
    expect(screen.getByText(/Polígono ativo \(5 vértices/)).toBeInTheDocument();
  });

  it.each(['GESTOR', 'ANALISTA'])(
    'perfil %s vê "Criar Demanda de Monitoramento" ao selecionar foco INPE',
    async (perfil) => {
      iniciarSessao({ ...USUARIO_ADMIN, perfil });
      const user = userEvent.setup();
      const { container } = renderPagina();
      await screen.findByText('4 demandas no mapa');
      await ligar(container, user, FOCOS);
      await waitFor(() => expect(marcadores(container)).toHaveLength(4 + 8), { timeout: 5000 });

      fireEvent.click([...marcadores(container)].at(-1));
      const caixa = await painel();
      const criar = await within(caixa).findByRole('link', {
        name: 'Criar Demanda de Monitoramento',
      });
      expect(criar.getAttribute('href')).toContain('/flux/demandas/nova?');
      expect(criar.getAttribute('href')).toContain('origem=MONITORAMENTO');
      expect(criar.getAttribute('href')).toContain('categoria=QUEIMADA_INCENDIO');
    },
  );

  it.each(['FISCAL', 'CONSULTA'])(
    'perfil %s não vê "Criar Demanda de Monitoramento"',
    async (perfil) => {
      iniciarSessao({ ...USUARIO_ADMIN, perfil });
      const user = userEvent.setup();
      const { container } = renderPagina();
      await screen.findByText('4 demandas no mapa');
      await ligar(container, user, DETER);
      await waitFor(() => expect(marcadores(container)).toHaveLength(4 + 2), { timeout: 5000 });

      fireEvent.click([...marcadores(container)].at(-2));
      const caixa = await painel();
      await within(caixa).findByText('INPE — dados públicos reais');
      expect(
        within(caixa).queryByRole('link', { name: 'Criar Demanda de Monitoramento' }),
      ).not.toBeInTheDocument();
    },
  );
});

describe('formatação da área e geometria da seleção', () => {
  it('formata hectares e km² em pt-BR sem inventar valor', () => {
    expect(formatarHectares(13.2)).toBe('13,20 ha');
    expect(formatarHectares(1234.5)).toBe('1.234,50 ha');
    expect(formatarHectares(0)).toBe('< 0,01 ha');
    expect(formatarHectares(null)).toBeNull();
    expect(formatarKm2(0.13200473633075194)).toBe('0,132005 km²');
    expect(formatarKm2(null)).toBeNull();
  });

  it('limites e geometria a desenhar por tipo de seleção', () => {
    const g = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-55.52, -11.88],
            [-55.5, -11.86],
            [-55.52, -11.88],
          ],
        ],
      ],
    };
    expect(limitesDaGeometria(g)).toEqual([
      [-11.88, -55.52],
      [-11.86, -55.5],
    ]);
    expect(limitesDaGeometria(null)).toBeNull();
    expect(geometriaDaSelecao({ tipo: 'DESMATAMENTO' }, { geometria: g })).toBe(g);
    expect(geometriaDaSelecao({ tipo: 'FOCO_CALOR' }, { geometria: null })).toBeNull();
    expect(geometriaDaSelecao({ tipo: 'DEMANDA' }, { areaGeometria: g })).toBe(g);
    expect(geometriaDaSelecao(null, {})).toBeNull();
  });
});
