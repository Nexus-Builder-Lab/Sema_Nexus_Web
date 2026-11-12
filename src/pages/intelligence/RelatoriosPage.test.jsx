import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AuthProvider from '../../auth/AuthProvider.jsx';
import { ToastProvider } from '../../components/Toasts.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import RelatoriosPage from './RelatoriosPage.jsx';

const renderPagina = (rota = '/intelligence/relatorios') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <AuthProvider>
        <ToastProvider>
          <RelatoriosPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

describe('RelatoriosPage', () => {
  beforeEach(() => iniciarSessao());
  afterEach(() => vi.restoreAllMocks());

  it('lista as demandas e traz o cabeçalho demonstrativo de impressão', async () => {
    renderPagina();
    expect(await screen.findByText('DEM-2026/0025')).toBeInTheDocument();
    const cabecalho = screen.getByTestId('cabecalho-impressao');
    expect(cabecalho).toHaveTextContent('AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS');
  });

  it('aplica filtros na consulta e no resumo de impressão', async () => {
    let consulta = null;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/relatorios/demandas')) consulta = new URL(request.url);
    });
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('DEM-2026/0025');
    await user.selectOptions(screen.getByLabelText('Bioma'), 'CERRADO');
    await user.selectOptions(screen.getByLabelText('Status'), 'PENDENTE');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(consulta?.searchParams.get('bioma')).toBe('CERRADO'));
    expect(consulta.searchParams.get('status')).toBe('PENDENTE');
    expect(screen.getByTestId('cabecalho-impressao')).toHaveTextContent('Bioma: Cerrado');
    server.events.removeAllListeners();
  });

  it('valida o período antes de consultar', async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('DEM-2026/0025');
    await user.type(screen.getByLabelText('De'), '2026-10-20');
    await user.type(screen.getByLabelText('Até'), '2026-10-10');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/não pode ser posterior/);
  });

  it('baixa o CSV com os filtros aplicados', async () => {
    let consulta = null;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('demandas.csv')) consulta = new URL(request.url);
    });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderPagina('/intelligence/relatorios?bioma=PANTANAL');
    await screen.findAllByRole('table');
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() => expect(clique).toHaveBeenCalled(), { timeout: 5000 });
    expect(consulta.searchParams.get('bioma')).toBe('PANTANAL');
    server.events.removeAllListeners();
  });

  it('"Salvar como PDF" abre a impressão do navegador', async () => {
    window.print = vi.fn();
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('DEM-2026/0025');
    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('mostra estado vazio e erro com nova tentativa', async () => {
    renderPagina('/intelligence/relatorios?municipioId=999999');
    expect(await screen.findByText('Nenhuma demanda encontrada')).toBeInTheDocument();
  });

  it('mostra erro da API', async () => {
    server.use(
      http.get('/api/relatorios/demandas', () =>
        HttpResponse.json({ title: 'Acesso negado', status: 403 }, { status: 403 }),
      ),
    );
    renderPagina();
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('o cabeçalho impresso informa a página exibida e o total', async () => {
    renderPagina();
    await screen.findByText('DEM-2026/0025');
    expect(screen.getByTestId('paginacao-impressao')).toHaveTextContent(
      /Exibindo página 1 de 2 \(25 registros\)/,
    );
  });

  it('mostra a mensagem do problem+json quando o CSV falha', async () => {
    server.use(
      http.get('/api/relatorios/demandas.csv', () =>
        HttpResponse.json(
          { title: 'Acesso negado', detail: 'Perfil sem permissão para relatórios.', status: 403 },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('DEM-2026/0025');
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(
      await screen.findByText('Perfil sem permissão para relatórios.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
  it('mostra cabeçalho do relatório, KPIs e distribuição por tipo', async () => {
    renderPagina();
    await screen.findByText('DEM-2026/0025');
    expect(
      screen.getByText('SEMA NEXUS · Relatório gerencial — ambiente demonstrativo'),
    ).toBeInTheDocument();
    expect(screen.getByText('Demandas recebidas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Distribuição por tipo' })).toBeInTheDocument();
    expect(screen.getByText(/Emitido em/)).toBeInTheDocument();
    expect(screen.queryByText(/Secretaria de Estado/)).not.toBeInTheDocument();
  });

  it('relatório de prazos usa os endpoints de Flux', async () => {
    renderPagina('/intelligence/relatorios?tipo=prazos');
    expect(await screen.findByText('Próximas do vencimento')).toBeInTheDocument();
    expect(await screen.findByText('DEM-2026/0031')).toBeInTheDocument();
    expect(screen.getByText('Vencida há 6 dia(s)')).toBeInTheDocument();
    expect(screen.getByText('Período: posição atual')).toBeInTheDocument();
  });

  it('relatório de produtividade mostra setores e filtra por setor', async () => {
    let consulta = null;
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/flux/produtividade')) consulta = new URL(request.url);
    });
    const user = userEvent.setup();
    renderPagina('/intelligence/relatorios?tipo=produtividade');
    expect(await screen.findByRole('heading', { name: 'Por setor' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Setor')).toBeEnabled());
    await user.selectOptions(screen.getByLabelText('Setor'), '2');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(consulta?.searchParams.get('setorId')).toBe('2'));
    server.events.removeAllListeners();
  });

  it('relatório de documentos mostra estado vazio sem registros', async () => {
    server.use(
      http.get('/api/documentos', () =>
        HttpResponse.json({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 }),
      ),
    );
    renderPagina('/intelligence/relatorios?tipo=documentos');
    expect(await screen.findByText('Nenhum registro no período')).toBeInTheDocument();
    expect(screen.getByText('Documentos')).toBeInTheDocument();
  });

  it('exporta CSV de prazos gerado no cliente com o aviso demonstrativo', async () => {
    let conteudo = null;
    URL.createObjectURL = vi.fn((blob) => {
      conteudo = blob;
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderPagina('/intelligence/relatorios?tipo=prazos');
    await screen.findByText('DEM-2026/0031');
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() => expect(conteudo).not.toBeNull());
    expect(conteudo.type).toContain('text/csv');
    expect(conteudo.size).toBeGreaterThan(50);
  });
});
