import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { produtividadeMock } from '../../mocks/fixtures/intelligence.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import ProdutividadePage, { gerarCsvProdutividade } from './ProdutividadePage.jsx';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <canvas />,
  Line: () => <canvas />,
  Doughnut: () => <canvas />,
}));

const abrir = () =>
  render(
    <MemoryRouter>
      <ProdutividadePage />
    </MemoryRouter>,
  );

const valorDoCard = (rotulo) =>
  screen
    .getByText(rotulo, { selector: '.nx-kpi-label' })
    .closest('.nx-kpi')
    .querySelector('.nx-kpi-value').textContent;

describe('ProdutividadePage', () => {
  beforeEach(() => iniciarSessao());

  it('mostra KPIs, gráficos e tabela por responsável conforme a API', async () => {
    abrir();
    await screen.findByText('Atrasadas (ativas)', { selector: '.nx-kpi-label' });
    expect(valorDoCard('Demandas no período')).toBe('20');
    expect(valorDoCard('Percentual de conclusão')).toBe('30%');
    expect(valorDoCard('Tempo médio de conclusão')).toBe('12,5 d');
    expect(valorDoCard('Concluídas no prazo')).toBe('80%');
    expect(valorDoCard('Atrasadas (ativas)')).toBe('2');
    expect(screen.getByRole('heading', { name: 'Demandas por setor e situação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tempo médio de conclusão por setor/ })).toBeInTheDocument();
    expect(screen.getByText('Demandas recebidas × concluídas por mês')).toBeInTheDocument();
    const linhas = within(screen.getByRole('region', { name: 'Desempenho por responsável' })).getAllByRole('row');
    expect(linhas[1]).toHaveTextContent('Fiscal Demo B');
    expect(linhas[1]).toHaveTextContent('—');
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThan(0);
  });

  it('envia o período e o setor escolhidos à API', async () => {
    const consultas = [];
    server.use(
      http.get('/api/flux/produtividade', ({ request }) => {
        consultas.push(new URL(request.url).searchParams);
        return HttpResponse.json(produtividadeMock());
      }),
    );
    abrir();
    await screen.findByLabelText('Setor');
    await userEvent.selectOptions(screen.getByLabelText('Período'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Setor'), 'DEMO-FISC');
    await waitFor(() => expect(consultas.at(-1).get('setorId')).toBe('2'));
    expect(consultas[0].get('setorId')).toBeNull();
    expect(consultas.some((c) => c.get('de') && c.get('ate'))).toBe(true);
  });

  it('mostra estado vazio sem dados e erro com nova tentativa', async () => {
    server.use(
      http.get('/api/flux/produtividade', () =>
        HttpResponse.json({
          ...produtividadeMock(),
          kpis: { ...produtividadeMock().kpis, percentualConclusao: null, tempoMedioConclusaoDias: null },
          porSetorSituacao: [],
          historicoMensal: [],
          porResponsavel: [],
        }),
      ),
    );
    abrir();
    expect(await screen.findByText('Sem dados no período')).toBeInTheDocument();
    expect(valorDoCard('Percentual de conclusão')).toBe('—');
  });

  it('mostra erro da API', async () => {
    server.use(http.get('/api/flux/produtividade', () => HttpResponse.json({}, { status: 500 })));
    abrir();
    expect(await screen.findByText('Não foi possível carregar a produtividade')).toBeInTheDocument();
  });

  it('gera CSV com setores e responsáveis', () => {
    const csv = gerarCsvProdutividade(produtividadeMock());
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('Nível;Nome;Total;Concluídas;Ativas;Atrasadas;Tempo médio (dias);% conclusão');
    expect(linhas[1]).toBe('Setor;Fiscalização Ambiental;12;4;8;2;14,2;33%');
    expect(linhas).toContain('Responsável;Fiscal Demo A;5;2;3;1;11,5;40%');
  });
});
