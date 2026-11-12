import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { forwardRef, useImperativeHandle } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '../../components/Toasts.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import { gerarCsvIndicador, periodoAnterior } from './analiseIndicadores.js';
import IndicadoresPage from './IndicadoresPage.jsx';

vi.mock('react-chartjs-2', () => {
  const stub = (tipo) =>
    forwardRef(function Grafico({ data, 'aria-label': ariaLabel }, ref) {
      useImperativeHandle(ref, () => ({ toBase64Image: () => 'data:image/png;base64,AAA' }));
      return (
        <div data-testid={`grafico-${tipo}`} role="img" aria-label={ariaLabel}>
          {JSON.stringify(data.labels)}
        </div>
      );
    });
  return { Bar: stub('bar'), Line: stub('line'), Doughnut: stub('doughnut') };
});

const SERIE = {
  itens: [
    { mes: '2026-09', cadastradas: 12, finalizadas: 7 },
    { mes: '2026-10', cadastradas: 16, finalizadas: 5 },
  ],
};

const renderPagina = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <IndicadoresPage />
      </ToastProvider>
    </MemoryRouter>,
  );

describe('IndicadoresPage (Análise de indicadores)', () => {
  beforeEach(() => {
    iniciarSessao();
    server.use(http.get('/api/intelligence/serie-mensal', () => HttpResponse.json(SERIE)));
  });

  it('mostra gráfico, leitura dos dados e tabela', async () => {
    renderPagina();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Análise de indicadores' }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('grafico-bar')).toBeInTheDocument();
    const leitura = screen.getByRole('region', { name: 'Leitura dos dados' });
    expect(leitura).toHaveTextContent('Maior valor em out/26: 16 demandas.');
    expect(leitura).toHaveTextContent('Total de 28 demandas em "Recebidas".');
    expect(leitura).toHaveTextContent('Taxa de resolução no período: 43%');
    expect(leitura).toHaveTextContent(/não utiliza IA/);
    const tabela = screen.getByRole('region', { name: 'Dados do gráfico' });
    expect(within(tabela).getByText('set/26')).toBeInTheDocument();
    expect(within(tabela).getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThan(0);
  });

  it('troca de indicador, tipo de gráfico e compara com o período anterior', async () => {
    const user = userEvent.setup();
    const pedidos = [];
    server.use(
      http.get('/api/intelligence/por-categoria', ({ request }) => {
        pedidos.push(new URL(request.url).searchParams.get('de'));
        return HttpResponse.json({
          itens: [
            { codigo: 'A', rotulo: 'Queimada', total: pedidos.length === 1 ? 10 : 5 },
            { codigo: 'B', rotulo: 'Desmatamento', total: 4 },
            { codigo: 'C', rotulo: 'Pesca', total: 2 },
          ],
        });
      }),
    );
    renderPagina();
    await screen.findByTestId('grafico-bar');
    await user.selectOptions(screen.getByLabelText('Indicador'), 'demandas_categoria');
    await waitFor(() => expect(screen.getByRole('img')).toHaveTextContent('Queimada'));
    await user.click(screen.getByLabelText(/Comparar com o período anterior/));
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Dados do gráfico' })).toHaveTextContent(
        '(período anterior)',
      ),
    );
    expect(pedidos.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('region', { name: 'Leitura dos dados' })).toHaveTextContent(
      /Variação em relação ao período anterior/,
    );
    await user.selectOptions(screen.getByLabelText('Tipo de gráfico'), 'doughnut');
    expect(await screen.findByTestId('grafico-doughnut')).toBeInTheDocument();
  });

  it('avisa período inválido e mostra vazio', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByTestId('grafico-bar');
    const ate = screen.getByLabelText('Até');
    await user.clear(ate);
    await user.type(ate, '2000-01-01');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Período inválido/);
    expect(screen.getByRole('button', { name: /Exportar dados/ })).toBeDisabled();
  });

  it('exporta CSV e PNG', async () => {
    const user = userEvent.setup();
    const baixados = [];
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      baixados.push(this.download);
    });
    renderPagina();
    await screen.findByTestId('grafico-bar');
    await user.click(screen.getByRole('button', { name: /Exportar dados \(CSV\)/ }));
    await user.click(screen.getByRole('button', { name: /Baixar gráfico \(PNG\)/ }));
    expect(baixados[0]).toMatch(/^indicador_recebidas_concluidas_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(baixados[1]).toMatch(/\.png$/);
    clique.mockRestore();
  });

  it('mostra erro com nova tentativa quando a API falha', async () => {
    server.use(
      http.get('/api/intelligence/serie-mensal', () =>
        HttpResponse.json(
          { title: 'Erro interno', status: 500, detail: 'falhou' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    renderPagina();
    expect(await screen.findByRole('alert')).toHaveTextContent(/falhou/i);
  });

  it('o filtro de setor fica indisponível (pendência de contrato)', async () => {
    renderPagina();
    expect(screen.getByLabelText(/Setor/)).toBeDisabled();
  });
});

describe('analiseIndicadores', () => {
  it('período anterior tem a mesma duração e termina no dia anterior', () => {
    expect(periodoAnterior('2026-11-01', '2026-11-10')).toEqual({
      de: '2026-10-22',
      ate: '2026-10-31',
    });
  });

  it('CSV usa ";" e vírgula decimal', () => {
    const csv = gerarCsvIndicador({
      labels: ['A'],
      series: [{ label: 'Valor', data: [1.5] }],
    });
    expect(csv).toBe('"Categoria";"Valor"\r\n"A";1,5');
  });
});
