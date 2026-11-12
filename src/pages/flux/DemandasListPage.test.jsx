import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../test/auth.js';

function LocalAtual() {
  const { pathname, search } = useLocation();
  return <span data-testid="local">{`${pathname}${search}`}</span>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocalAtual />
    </MemoryRouter>,
  );
}

const linhas = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const aguardarLista = () => screen.findByRole('table', { name: /lista de demandas/i });

describe('Listagem de demandas', () => {
  beforeEach(() => iniciarSessao());

  it('mostra o carregamento e depois a tabela com as colunas da Issue', async () => {
    renderAt('/flux/demandas');
    expect(screen.getAllByText('Carregando...').length).toBeGreaterThan(0);

    await aguardarLista();
    for (const coluna of [
      'Número',
      'Demanda',
      'Equipe',
      'Responsável',
      'Prioridade',
      'Situação',
      'Prazo',
      'Abertura',
    ]) {
      expect(screen.getByRole('columnheader', { name: new RegExp(coluna) })).toBeInTheDocument();
    }
    // Mais recentes primeiro, 20 por página (25 demandas fictícias).
    expect(linhas()).toHaveLength(20);
    const primeira = within(linhas()[0]);
    expect(primeira.getByRole('link', { name: 'DEM-2026/0025' })).toHaveAttribute(
      'href',
      '/flux/demandas/25',
    );
    expect(primeira.getByText('Distribuída')).toBeInTheDocument();
    expect(primeira.getByText(/Vencida há \d+ dias?/)).toBeInTheDocument();
    expect(primeira.getByText(/· .*\/MT|.*\/MT/)).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();
  });

  it('mostra os 6 indicadores por situação e o cabeçalho da central', async () => {
    renderAt('/flux/demandas');
    await aguardarLista();
    expect(screen.getByRole('heading', { name: 'Central de demandas' })).toBeInTheDocument();
    const kpis = screen.getByRole('region', { name: 'Indicadores por situação' });
    for (const rotulo of [
      'Total',
      'Abertas',
      'Em triagem',
      'Em andamento',
      'Finalizadas',
      'Vencidas',
    ]) {
      expect(within(kpis).getByText(rotulo)).toBeInTheDocument();
    }
    await waitFor(() => expect(within(kpis).getByText('25')).toBeInTheDocument());
  });

  it('Exportar CSV baixa o arquivo autenticado com os filtros', async () => {
    const user = userEvent.setup();
    const criar = vi.fn(() => 'blob:csv');
    URL.createObjectURL = criar;
    URL.revokeObjectURL = vi.fn();
    renderAt('/flux/demandas?status=PENDENTE');
    await aguardarLista();

    await user.click(screen.getByRole('button', { name: /Exportar CSV/ }));

    await waitFor(() => expect(criar).toHaveBeenCalled());
  });

  it('paginação usa a API: a página 2 vai para a URL e mostra o restante', async () => {
    const user = userEvent.setup();
    renderAt('/flux/demandas');
    await aguardarLista();

    await user.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('page=1'));
    await waitFor(() => expect(linhas()).toHaveLength(5));
    expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument();
  });

  it('pesquisa por número ou título e reflete o filtro na URL', async () => {
    const user = userEvent.setup();
    renderAt('/flux/demandas');
    await aguardarLista();

    await user.type(screen.getByLabelText('Pesquisar por número ou título'), 'DEM-2026/0010');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() => expect(linhas()).toHaveLength(1));
    expect(screen.getByRole('link', { name: 'DEM-2026/0010' })).toBeInTheDocument();
    expect(screen.getByTestId('local')).toHaveTextContent('q=DEM-2026%2F0010');
  });

  it('lê os filtros da URL e aplica na API e nos campos', async () => {
    renderAt('/flux/demandas?status=PENDENTE&prioridade=BAIXA');
    await aguardarLista();

    expect(screen.getByLabelText('Status')).toHaveValue('PENDENTE');
    expect(screen.getByLabelText('Prioridade')).toHaveValue('BAIXA');
    for (const linha of linhas()) {
      expect(within(linha).getByText('Pendente')).toBeInTheDocument();
    }
  });

  it('filtra por município, categoria e período e limpa tudo com Limpar', async () => {
    const user = userEvent.setup();
    renderAt('/flux/demandas');
    await aguardarLista();
    await screen.findByRole('option', { name: 'Sinop' });

    await user.selectOptions(screen.getByLabelText('Município'), 'Sinop');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'FAUNA_SILVESTRE');
    await user.type(screen.getByLabelText('Recebida de'), '2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() =>
      expect(screen.getByTestId('local')).toHaveTextContent('municipioId=5107909'),
    );
    expect(screen.getByTestId('local')).toHaveTextContent('categoria=FAUNA_SILVESTRE');
    expect(screen.getByTestId('local')).toHaveTextContent('de=2026-10-01');
    await waitFor(() => {
      for (const linha of linhas())
        expect(within(linha).getByText(/Sinop\/MT/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() =>
      expect(screen.getByTestId('local')).toHaveTextContent(/^\/flux\/demandas$/),
    );
    expect(screen.getByLabelText('Município')).toHaveValue('');
    await waitFor(() => expect(linhas()).toHaveLength(20));
  });

  it('ADMIN/GESTOR filtram por equipe e depois por fiscal', async () => {
    const user = userEvent.setup();
    renderAt('/flux/demandas');
    await aguardarLista();
    await screen.findByRole('option', { name: /Equipe Alfa/ });

    expect(screen.getByLabelText('Fiscal responsável')).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Equipe responsável'), '1');
    await screen.findByRole('option', { name: 'Fiscal Demonstrativo 2' });
    await user.selectOptions(screen.getByLabelText('Fiscal responsável'), '3');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('equipeId=1'));
    expect(screen.getByTestId('local')).toHaveTextContent('fiscalId=3');
    await waitFor(() => expect(linhas().length).toBeGreaterThan(0));
    expect(linhas().length).toBeLessThan(20);
  });

  it('esconde o filtro de equipe quando a API nega o acesso às equipes (403)', async () => {
    server.use(
      http.get('/api/equipes', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Acesso negado', status: 403 },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    renderAt('/flux/demandas');
    await aguardarLista();
    expect(screen.getByLabelText('Município')).toBeInTheDocument();
    expect(screen.queryByLabelText('Equipe responsável')).not.toBeInTheDocument();
  });

  it('ordena pelo servidor ao clicar no cabeçalho', async () => {
    const user = userEvent.setup();
    renderAt('/flux/demandas');
    await aguardarLista();

    await user.click(screen.getByRole('button', { name: /Número/ }));

    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('sort=numero%2Casc'));
    await waitFor(() =>
      expect(within(linhas()[0]).getByRole('link', { name: 'DEM-2026/0001' })).toBeInTheDocument(),
    );
  });

  it('mostra o estado vazio quando nada corresponde aos filtros', async () => {
    renderAt('/flux/demandas?q=inexistente-xyz');
    expect(await screen.findByText('Nenhuma demanda encontrada')).toBeInTheDocument();
    expect(screen.getByText(/corresponde aos filtros/)).toBeInTheDocument();
  });

  it('mostra erro com "Tentar novamente" e se recupera', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(
        '/api/demandas',
        () =>
          HttpResponse.json(
            { type: 'about:blank', title: 'Erro interno', status: 500, detail: 'Falha simulada.' },
            { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        { once: true },
      ),
    );
    renderAt('/flux/demandas');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Falha simulada.');

    await user.click(within(alerta).getByRole('button', { name: 'Tentar novamente' }));
    await aguardarLista();
    expect(linhas()).toHaveLength(20);
  });

  it('ADMIN vê "Nova demanda" e "Editar" só em demandas editáveis', async () => {
    renderAt('/flux/demandas?sort=numero%2Casc');
    await aguardarLista();

    expect(screen.getByRole('link', { name: 'Nova demanda' })).toHaveAttribute(
      'href',
      '/flux/demandas/nova',
    );
    // 0001 = Pendente (editável); 0004 = Distribuída (não).
    expect(screen.getByRole('link', { name: 'Editar DEM-2026/0001' })).toHaveAttribute(
      'href',
      '/flux/demandas/1/editar',
    );
    expect(screen.queryByRole('link', { name: 'Editar DEM-2026/0004' })).not.toBeInTheDocument();
  });

  it('CONSULTA não vê "Nova demanda" nem "Editar"', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'CONSULTA' });
    renderAt('/flux/demandas');
    await aguardarLista();

    expect(screen.queryByRole('link', { name: 'Nova demanda' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Editar/ })).not.toBeInTheDocument();
  });
});
