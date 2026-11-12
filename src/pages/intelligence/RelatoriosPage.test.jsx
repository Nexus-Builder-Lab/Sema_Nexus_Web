import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '../../components/Toasts.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import RelatoriosPage from './RelatoriosPage.jsx';

const renderPagina = (rota = '/intelligence/relatorios') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <ToastProvider>
        <RelatoriosPage />
      </ToastProvider>
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
    await user.type(screen.getByLabelText('Recebidas de'), '2026-10-20');
    await user.type(screen.getByLabelText('Recebidas até'), '2026-10-10');
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
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Baixar CSV' }));
    await waitFor(() => expect(clique).toHaveBeenCalled());
    expect(consulta.searchParams.get('bioma')).toBe('PANTANAL');
    server.events.removeAllListeners();
  });

  it('"Salvar como PDF" abre a impressão do navegador', async () => {
    window.print = vi.fn();
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText('DEM-2026/0025');
    await user.click(screen.getByRole('button', { name: 'Salvar como PDF' }));
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
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Baixar CSV' }));
    expect(await screen.findByText('Perfil sem permissão para relatórios.')).toBeInTheDocument();
  });
});
