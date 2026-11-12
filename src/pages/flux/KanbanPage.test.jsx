import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

function abrir() {
  return render(
    <MemoryRouter initialEntries={['/flux/kanban']}>
      <App />
    </MemoryRouter>,
  );
}

const coluna = (nome) => screen.getByRole('region', { name: nome });

describe('Fluxo de atividades (Kanban)', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('mostra carregamento e as 7 colunas por status com cartões', async () => {
    abrir();
    expect(screen.getByText('Carregando quadro...')).toBeInTheDocument();
    await screen.findByTestId('kb-card-1');
    for (const nome of [
      'Pendente',
      'Em triagem',
      'Aguardando distribuição',
      'Distribuída',
      'Em andamento',
      'Aguardando conclusão',
      'Finalizada',
    ]) {
      expect(coluna(nome)).toBeInTheDocument();
    }
    expect(within(coluna('Pendente')).getByText('DEM-2026/0001')).toBeInTheDocument();
  });

  it('item "Fluxo de atividades" aparece no menu SEMA Flux', async () => {
    abrir();
    await screen.findByTestId('kb-card-1');
    expect(screen.getAllByRole('link', { name: /Fluxo de atividades/ }).length).toBeGreaterThan(0);
  });

  it('filtra por pesquisa', async () => {
    const user = userEvent.setup();
    abrir();
    await screen.findByTestId('kb-card-1');
    await user.type(screen.getByLabelText('Pesquisar'), 'DEM-2026/0002');
    expect(screen.queryByTestId('kb-card-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('kb-card-2')).toBeInTheDocument();
  });

  it('mover pelo menu só oferece destinos válidos e inicia a triagem', async () => {
    const user = userEvent.setup();
    abrir();
    await screen.findByTestId('kb-card-1');
    const menu = screen.getByLabelText('Mover DEM-2026/0001 para');
    expect(
      within(menu)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Mover para...', '→ Em triagem']);
    await user.selectOptions(menu, 'EM_TRIAGEM');
    await user.click(await screen.findByRole('button', { name: 'Iniciar triagem' }));
    await waitFor(() =>
      expect(within(coluna('Em triagem')).getByText('DEM-2026/0001')).toBeInTheDocument(),
    );
  });

  it('arrastar para coluna inválida não move e avisa', async () => {
    let chamadas = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') chamadas += 1;
    });
    abrir();
    const card = await screen.findByTestId('kb-card-1');
    const dataTransfer = { setData: () => {}, effectAllowed: '' };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(screen.getByTestId('kb-col-FINALIZADA'), { dataTransfer });
    expect(await screen.findByText(/Movimentação não permitida/)).toBeInTheDocument();
    expect(within(coluna('Pendente')).getByText('DEM-2026/0001')).toBeInTheDocument();
    expect(chamadas).toBe(0);
    server.events.removeAllListeners();
  });

  it('arrastar para coluna válida abre a confirmação', async () => {
    abrir();
    const card = await screen.findByTestId('kb-card-1');
    const dataTransfer = { setData: () => {}, effectAllowed: '' };
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(screen.getByTestId('kb-col-EM_TRIAGEM'), { dataTransfer });
    expect(await screen.findByRole('button', { name: 'Iniciar triagem' })).toBeInTheDocument();
  });

  it('mostra estado de erro com nova tentativa', async () => {
    server.use(
      http.get('/api/demandas', () =>
        HttpResponse.json({ status: 500, title: 'Erro' }, { status: 500 }),
      ),
    );
    abrir();
    expect(await screen.findByText('Não foi possível carregar o quadro')).toBeInTheDocument();
  });

  it('mostra estado vazio', async () => {
    server.use(
      http.get('/api/demandas', () =>
        HttpResponse.json({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 }),
      ),
    );
    abrir();
    expect(await screen.findByText('Nenhuma demanda cadastrada')).toBeInTheDocument();
  });
});
