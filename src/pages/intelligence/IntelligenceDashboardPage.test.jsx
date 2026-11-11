import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { resumoMock } from '../../mocks/fixtures/intelligence.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import IntelligenceDashboardPage from './IntelligenceDashboardPage.jsx';

// jsdom não tem canvas: os gráficos viram um stub que expõe os dados recebidos.
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

function renderPagina(url = '/intelligence') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <IntelligenceDashboardPage />
    </MemoryRouter>,
  );
}

const dadosDoGrafico = (nome) => JSON.parse(screen.getByRole('img', { name: nome }).textContent);

const valorDoCard = (rotulo) =>
  screen
    .getByText(rotulo, { selector: '.nx-kpi-label' })
    .closest('.nx-kpi')
    .querySelector('.nx-kpi-value').textContent;

const respostaErro = (detail) =>
  HttpResponse.json(
    { title: 'Erro interno', status: 500, detail },
    { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
  );

describe('IntelligenceDashboardPage', () => {
  beforeEach(() => iniciarSessao());

  it('mostra cards e os cinco gráficos com os dados da API (mocks)', async () => {
    renderPagina();
    const esperado = resumoMock();
    await waitFor(() =>
      expect(valorDoCard('Total de demandas')).toBe(esperado.totalDemandas.toLocaleString('pt-BR')),
    );
    expect(valorDoCard('Concluídas')).toBe(String(esperado.finalizadas));
    expect(valorDoCard('Pendentes')).toBe(String(esperado.pendentes));
    expect(valorDoCard('Em fiscalização')).toBe(String(esperado.emAndamento));

    expect(
      await screen.findByRole('img', { name: /evolução mensal de demandas/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /por situação/i })).toBeInTheDocument();
    expect(dadosDoGrafico(/por situação/i).labels).toHaveLength(7);
    expect(dadosDoGrafico(/por bioma/i).labels).toEqual(['Amazônia', 'Cerrado', 'Pantanal']);
    expect(dadosDoGrafico(/por categoria/i).labels.length).toBeGreaterThan(0);
    const municipios = dadosDoGrafico(/por município/i);
    expect(municipios.labels.length).toBeLessThanOrEqual(10);
    // do maior para o menor
    const totais = municipios.series[0];
    expect(totais).toEqual([...totais].sort((a, b) => b - a));
  });

  it('exibe o selo demonstrativo em cada painel', async () => {
    renderPagina();
    await screen.findByRole('img', { name: /por bioma/i });
    // 5 painéis + cabeçalho da página
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThanOrEqual(6);
    screen
      .getAllByTestId('demo-seal')
      .forEach((selo) =>
        expect(selo).toHaveTextContent('AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS'),
      );
  });

  it('cada card tem tooltip explicando o indicador', async () => {
    renderPagina();
    await waitFor(() => expect(valorDoCard('Pendentes')).not.toBe('—'));
    const info = screen.getByRole('button', { name: 'Sobre o indicador Pendentes' });
    expect(info).toHaveAttribute('title', expect.stringMatching(/triagem/i));
    expect(screen.getAllByRole('button', { name: /^Sobre o indicador/ })).toHaveLength(4);
  });

  it('filtros atualizam cards e gráficos', async () => {
    const user = userEvent.setup();
    renderPagina();
    await waitFor(() => expect(valorDoCard('Total de demandas')).not.toBe('—'));
    await screen.findByRole('img', { name: /por bioma/i });
    const antes = dadosDoGrafico(/por bioma/i).series[0];

    await screen.findByRole('option', { name: 'Pantanal' });
    await user.selectOptions(screen.getByLabelText('Bioma'), 'PANTANAL');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    const esperado = resumoMock({ bioma: 'PANTANAL' });
    expect(esperado.totalDemandas).toBeLessThan(resumoMock().totalDemandas);
    await waitFor(() =>
      expect(valorDoCard('Total de demandas')).toBe(String(esperado.totalDemandas)),
    );
    await waitFor(() =>
      expect(dadosDoGrafico(/por bioma/i).series[0]).toEqual([0, 0, esperado.totalDemandas]),
    );
    expect(dadosDoGrafico(/por bioma/i).series[0]).not.toEqual(antes);
    expect(screen.getByLabelText('Bioma')).toHaveValue('PANTANAL');
  });

  it('lê os filtros da URL, envia à API e permite limpar', async () => {
    const user = userEvent.setup();
    const consultas = [];
    server.use(
      http.get('/api/intelligence/resumo', ({ request }) => {
        consultas.push(new URL(request.url).search);
        return HttpResponse.json(resumoMock());
      }),
    );
    renderPagina('/intelligence?categoria=QUEIMADA_INCENDIO&de=2026-03-01');
    await waitFor(() => expect(consultas.length).toBeGreaterThan(0));
    expect(consultas[0]).toContain('categoria=QUEIMADA_INCENDIO');
    expect(consultas[0]).toContain('de=2026-03-01');
    expect(consultas[0]).not.toContain('bioma=');
    expect(screen.getByLabelText('Recebidas de')).toHaveValue('2026-03-01');

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() => expect(screen.getByLabelText('Recebidas de')).toHaveValue(''));
    await waitFor(() => expect(consultas.at(-1)).toBe(''));
  });

  it('recusa período invertido sem alterar os filtros', async () => {
    const user = userEvent.setup();
    renderPagina();
    await waitFor(() => expect(valorDoCard('Total de demandas')).not.toBe('—'));
    await user.type(screen.getByLabelText('Recebidas de'), '2026-06-01');
    await user.type(screen.getByLabelText('Recebidas até'), '2026-02-01');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /data inicial não pode ser posterior/i,
    );
    expect(screen.getByLabelText('Recebidas até')).toHaveAttribute('aria-invalid', 'true');
  });

  it('mostra estado vazio quando o filtro não retorna dados', async () => {
    server.use(
      http.get('/api/intelligence/por-categoria', () =>
        HttpResponse.json({ demonstrativo: true, aviso: 'x', itens: [] }),
      ),
      http.get('/api/intelligence/por-situacao', () =>
        HttpResponse.json({
          demonstrativo: true,
          aviso: 'x',
          itens: [{ codigo: 'PENDENTE', rotulo: 'Pendente', total: 0 }],
        }),
      ),
    );
    renderPagina();
    await waitFor(() => expect(screen.getAllByText('Sem dados')).toHaveLength(2));
    expect(screen.queryByRole('img', { name: /por categoria/i })).not.toBeInTheDocument();
  });

  it('mostra erro só no painel com falha e permite tentar novamente', async () => {
    const user = userEvent.setup();
    let falhar = true;
    server.use(
      http.get('/api/intelligence/por-bioma', () =>
        falhar
          ? respostaErro('Falha simulada.')
          : HttpResponse.json({ itens: [{ codigo: 'CERRADO', rotulo: 'Cerrado', total: 3 }] }),
      ),
    );
    renderPagina();
    const painel = await screen.findByRole('region', { name: 'Por bioma' });
    expect(await within(painel).findByRole('alert')).toHaveTextContent(/falha simulada/i);
    // os demais painéis seguem funcionando
    expect(await screen.findByRole('img', { name: /por situação/i })).toBeInTheDocument();

    falhar = false;
    await user.click(within(painel).getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('img', { name: /por bioma/i })).toBeInTheDocument();
  });

  it('mostra carregamento enquanto a API responde', () => {
    renderPagina();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
