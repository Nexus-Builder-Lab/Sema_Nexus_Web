import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from './App.jsx';

/**
 * Jornada integrada dos 6 fluxos críticos (Issue #12) pelo App real e pela API simulada (MSW):
 * rota protegida → login (erro e sucesso) → cadastro de demanda → triagem e distribuição →
 * upload de documento vinculado → filtros da listagem. Detalhes de cada fluxo ficam nos testes
 * de cada tela; aqui o objetivo é detectar regressão na costura entre eles.
 */
function LocalAtual() {
  const { pathname, search } = useLocation();
  return <span data-testid="local">{`${pathname}${search}`}</span>;
}

const local = () => screen.getByTestId('local');

describe('Jornada dos fluxos críticos', () => {
  beforeEach(() => sessionStorage.clear());

  it('percorre login, cadastro, triagem/distribuição, upload e filtros', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/flux/demandas/nova']}>
        <App />
        <LocalAtual />
      </MemoryRouter>,
    );

    // 1. Rota protegida e login (erro, depois sucesso).
    await screen.findByLabelText('E-mail');
    expect(local()).toHaveTextContent('/login');
    await user.type(screen.getByLabelText('E-mail'), 'admin@admin.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(local()).toHaveTextContent('/login');
    await user.clear(screen.getByLabelText('Senha'));
    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    // 2. Volta à rota pedida e cadastra a demanda.
    await screen.findByRole('form', { name: 'Dados da demanda' });
    await user.type(screen.getByLabelText(/^Título/), 'Queimada em área de preservação');
    await user.type(screen.getByLabelText(/^Descrição/), 'Relato fictício de queimada.');
    await user.selectOptions(screen.getByLabelText(/^Origem/), 'DENUNCIA');
    await user.type(screen.getByLabelText(/^Município/), 'Cuiabá');
    await user.click(screen.getByRole('button', { name: 'Cadastrar demanda' }));
    expect(await screen.findByText(/Demanda DEM-2026\/\d+ cadastrada com sucesso/)).toBeVisible();
    await waitFor(() => expect(local()).toHaveTextContent(/\/flux\/demandas\/\d+$/));

    // 3. Triagem e distribuição na tela da demanda.
    await user.click(await screen.findByRole('button', { name: 'Iniciar triagem' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Iniciar triagem' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Concluir triagem' }));
    let modal = await screen.findByRole('dialog', { name: 'Concluir triagem' });
    await user.selectOptions(within(modal).getByLabelText(/^Categoria/), 'DESMATAMENTO_ILEGAL');
    await user.selectOptions(within(modal).getByLabelText(/^Prioridade/), 'ALTA');
    await user.type(within(modal).getByLabelText(/^Justificativa/), 'Indícios compatíveis.');
    await user.click(within(modal).getByRole('button', { name: 'Concluir triagem' }));
    await user.click(await screen.findByRole('button', { name: 'Distribuir' }));
    modal = await screen.findByRole('dialog');
    await user.selectOptions(await within(modal).findByLabelText(/^Equipe/), '1');
    await user.selectOptions(await within(modal).findByLabelText(/^Fiscal/), '3');
    await user.type(within(modal).getByLabelText(/^Prazo/), '2099-12-31');
    await user.click(within(modal).getByRole('button', { name: 'Distribuir' }));
    const historico = await screen.findByRole('list', { name: 'Histórico da demanda' });
    await waitFor(() => expect(within(historico).getByText('Distribuição')).toBeInTheDocument());

    // 4. Upload de documento vinculado à demanda (corpo multipart lido como texto).
    // Navega sem recarregar (a sessão fica em memória): usa o histórico do router.
    await user.click(screen.getByRole('link', { name: /Documentos/ }));
    await user.click(await screen.findByRole('link', { name: /Enviar documento|Novo documento/ }));
    await screen.findByRole('form', { name: 'Dados do documento' });
    await user.upload(
      screen.getByLabelText(/^Arquivo/),
      new File(['%PDF-1.4'], 'laudo.pdf', { type: 'application/pdf' }),
    );
    await user.type(screen.getByLabelText(/^Título/), 'Laudo de vistoria fictício');
    await user.type(screen.getByLabelText(/^Categoria/), 'Relatório técnico');
    await user.type(screen.getByLabelText(/^Tipo/), 'Laudo');
    await user.click(screen.getByRole('button', { name: 'Enviar documento' }));
    expect(await screen.findByText('Documento enviado com sucesso.')).toBeVisible();
  }, 60000);

  it('filtra a listagem de demandas pelo App autenticado', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/flux/demandas']}>
        <App />
        <LocalAtual />
      </MemoryRouter>,
    );
    await screen.findByLabelText('E-mail');
    await user.type(screen.getByLabelText('E-mail'), 'admin@admin.com');
    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await screen.findByLabelText('Pesquisar por número ou título');
    await user.type(screen.getByLabelText('Pesquisar por número ou título'), 'DEM-2026/0010');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByRole('link', { name: 'DEM-2026/0010' })).toBeInTheDocument();
    expect(local()).toHaveTextContent('q=DEM-2026%2F0010');
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() => expect(local()).not.toHaveTextContent('q='));
  }, 30000);
});
