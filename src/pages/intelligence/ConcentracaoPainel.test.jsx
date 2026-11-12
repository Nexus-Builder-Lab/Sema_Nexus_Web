import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import {
  classeDe,
  corDaClasse,
  ESCALA,
  faixasLegenda,
  gerarCsv,
  intervaloDoPeriodo,
} from './concentracao.js';

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

const poligono = (x0, y0) => ({
  type: 'Polygon',
  coordinates: [
    [
      [x0, y0],
      [x0 + 2, y0],
      [x0 + 2, y0 + 2],
      [x0, y0 + 2],
      [x0, y0],
    ],
  ],
});
const UF = { type: 'Feature', properties: {}, geometry: poligono(-61, -18) };
const MALHA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { id: 5103403, nome: 'Cuiabá' }, geometry: poligono(-57, -16) },
    {
      type: 'Feature',
      properties: { id: 5107602, nome: 'Rondonópolis' },
      geometry: poligono(-55, -17),
    },
  ],
};

describe('concentracao.js (parâmetros do protótipo)', () => {
  it('classe = min(5, ceil(n/max*5)); sem cor quando 0', () => {
    expect(classeDe(0, 10)).toBe(0);
    expect(classeDe(1, 10)).toBe(1);
    expect(classeDe(10, 10)).toBe(5);
    expect(corDaClasse(0, 10)).toBe('transparent');
    expect(corDaClasse(10, 10)).toBe(ESCALA[5]);
  });

  it('legenda "até X" em 5 faixas', () => {
    expect(faixasLegenda(17).map((f) => f.ate)).toEqual([4, 7, 11, 14, 17]);
  });

  it('períodos rápidos e CSV', () => {
    const hoje = new Date(2026, 10, 12);
    expect(intervaloDoPeriodo('30d', hoje)).toEqual({ de: '2026-10-13', ate: '2026-11-12' });
    expect(intervaloDoPeriodo('12m', hoje)).toEqual({ de: '2025-11-12', ate: '2026-11-12' });
    expect(intervaloDoPeriodo('estiagem', hoje)).toEqual({ de: '2026-07-01', ate: '2026-10-31' });
    expect(gerarCsv([{ municipio: 'Cuiabá', bioma: 'CERRADO', total: 3 }])).toBe(
      '"Município";"Bioma";"Demandas"\r\n"Cuiabá";"CERRADO";3',
    );
  });
});

describe('Painel: concentração por município e ranking', () => {
  beforeEach(() => {
    iniciarSessao();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        json: async () => (String(url).includes('municipios') ? MALHA : UF),
      })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const renderPagina = () =>
    render(
      <MemoryRouter initialEntries={['/intelligence/inteligencia-ambiental']}>
        <App />
      </MemoryRouter>,
    );

  it('mostra os 6 KPIs, o ranking e a tabela por município', async () => {
    renderPagina();
    const ranking = await screen.findByRole('region', { name: 'Regiões com maior concentração' });
    expect(await within(ranking).findByText('Cuiabá')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Período rápido' })).toBeInTheDocument();
    for (const k of [
      'Demandas',
      'Pendentes',
      'Em andamento',
      'Finalizadas',
      'Atrasadas',
      'Documentos',
    ]) {
      expect(screen.getAllByText(k).length).toBeGreaterThan(0);
    }
    const tabela = screen.getByRole('region', { name: 'Indicadores por município' });
    expect(await within(tabela).findByText('Rondonópolis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeInTheDocument();
  });

  it('clique no ranking filtra o painel pelo município', async () => {
    const user = userEvent.setup();
    const consultas = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/api/intelligence/mapa') consultas.push(url.search);
    });
    renderPagina();
    const ranking = await screen.findByRole('region', { name: 'Regiões com maior concentração' });
    await user.click(await within(ranking).findByRole('button', { name: /Filtrar por Cuiabá/ }));
    await waitFor(() => expect(consultas.at(-1)).toContain('municipioId=5103403'));
    expect(screen.getByLabelText('Município')).toHaveValue('5103403');
  });

  it('modo concentração: legenda, tooltip com nome, total e bioma e clique filtra', async () => {
    const user = userEvent.setup();
    const consultas = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/api/intelligence/mapa') consultas.push(url.search);
    });
    const { container } = renderPagina();
    const ranking = await screen.findByRole('region', { name: 'Regiões com maior concentração' });
    await within(ranking).findByText('Cuiabá');
    await user.click(screen.getByRole('button', { name: 'Concentração por município' }));

    const legenda = await screen.findByRole('group', {
      name: 'Legenda da concentração por município',
    });
    expect(within(legenda).getByText('Ocorrências por município')).toBeInTheDocument();
    expect(within(legenda).getAllByText(/^até \d+$/)).toHaveLength(5);
    expect(within(legenda).getByText('Clique em um município para filtrar')).toBeInTheDocument();

    await waitFor(() =>
      expect(container.querySelectorAll('path.leaflet-interactive').length).toBe(2),
    );
    const [cuiaba] = container.querySelectorAll('path.leaflet-interactive');
    fireEvent.mouseOver(cuiaba);
    const tip = await waitFor(() => {
      const el = container.querySelector('.leaflet-tooltip');
      expect(el).toBeTruthy();
      return el;
    });
    expect(tip).toHaveTextContent(/Cuiabá/);
    expect(tip).toHaveTextContent(/demandas? · Cerrado/);

    fireEvent.click(cuiaba);
    await waitFor(() => expect(consultas.at(-1)).toContain('municipioId=5103403'));
  });
});
