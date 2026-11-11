import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { acoesDisponiveis } from '../../auth/perfis.js';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../test/auth.js';

// Com 25 demandas: id 1 = PENDENTE, 2 = EM_TRIAGEM, 3 = AGUARDANDO_DISTRIBUICAO, 4 = DISTRIBUIDA.
function abrir(id) {
  return render(
    <MemoryRouter initialEntries={[`/flux/demandas/${id}`]}>
      <App />
    </MemoryRouter>,
  );
}

const botao = (nome) => screen.queryByRole('button', { name: nome });

describe('acoesDisponiveis', () => {
  const gestor = { perfil: 'GESTOR' };
  const analista = { perfil: 'ANALISTA' };
  const fiscal = { perfil: 'FISCAL' };

  it('libera ações conforme status e perfil', () => {
    expect(acoesDisponiveis('PENDENTE', analista)).toEqual(['INICIAR_TRIAGEM']);
    expect(acoesDisponiveis('EM_TRIAGEM', gestor)).toEqual([
      'CONCLUIR_TRIAGEM',
      'SOLICITAR_COMPLEMENTACAO',
    ]);
    expect(acoesDisponiveis('AGUARDANDO_DISTRIBUICAO', gestor)).toEqual(['DISTRIBUIR']);
    expect(acoesDisponiveis('AGUARDANDO_DISTRIBUICAO', analista)).toEqual([]);
    expect(acoesDisponiveis('PENDENTE', fiscal)).toEqual([]);
    expect(acoesDisponiveis('DISTRIBUIDA', gestor)).toEqual(['INICIAR_EXECUCAO']);
    expect(acoesDisponiveis('FINALIZADA', gestor)).toEqual([]);
  });
});

describe('Detalhes da demanda', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('mostra dados e linha do tempo', async () => {
    abrir(1);
    expect(await screen.findByRole('heading', { name: /DEM-2026\/0001/ })).toBeInTheDocument();
    expect(screen.getByText('Situação')).toBeInTheDocument();
    const linha = await screen.findByRole('list', { name: 'Histórico da demanda' });
    expect(within(linha).getByText('Cadastro')).toBeInTheDocument();
  });

  it('mostra erro claro quando a demanda não existe', async () => {
    abrir(999);
    expect(await screen.findByText('Demanda não encontrada')).toBeInTheDocument();
  });

  it('leva a demanda de Pendente até Distribuída sem sair da tela', async () => {
    const user = userEvent.setup();
    abrir(1);

    await user.click(await screen.findByRole('button', { name: 'Iniciar triagem' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Iniciar triagem' }),
    );
    expect(await screen.findByRole('button', { name: 'Concluir triagem' })).toBeInTheDocument();
    expect(botao('Iniciar triagem')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Concluir triagem' }));
    let modal = await screen.findByRole('dialog', { name: 'Concluir triagem' });
    await user.click(within(modal).getByRole('button', { name: 'Concluir triagem' }));
    expect(await within(modal).findByText('Informe a justificativa.')).toBeInTheDocument();
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

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const linha = await screen.findByRole('list', { name: 'Histórico da demanda' });
    await waitFor(() => expect(within(linha).getByText('Distribuição')).toBeInTheDocument());
    expect(within(linha).getAllByText('Triagem').length).toBeGreaterThanOrEqual(2);
    expect(botao('Distribuir')).not.toBeInTheDocument();
    expect(screen.getByText('Equipe Alfa (demonstração)')).toBeInTheDocument();
  });

  it('solicita complementação apenas com justificativa', async () => {
    const user = userEvent.setup();
    abrir(2);
    await user.click(await screen.findByRole('button', { name: 'Solicitar complementação' }));
    const modal = await screen.findByRole('dialog');
    expect(within(modal).queryByLabelText(/^Categoria/)).not.toBeInTheDocument();
    await user.type(within(modal).getByLabelText(/^Justificativa/), 'Faltam coordenadas.');
    await user.click(within(modal).getByRole('button', { name: 'Solicitar complementação' }));
    expect(await screen.findByRole('button', { name: 'Iniciar triagem' })).toBeInTheDocument();
    expect(await screen.findByText('Complementação solicitada')).toBeInTheDocument();
  });

  it('esconde ações para perfis sem permissão', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'ANALISTA' });
    abrir(3);
    await screen.findByRole('heading', { name: /DEM-2026\/0003/ });
    expect(botao('Distribuir')).not.toBeInTheDocument();
    expect(botao('Iniciar triagem')).not.toBeInTheDocument();
  });

  it('não mostra ações de fluxo em demanda já distribuída', async () => {
    abrir(4);
    await screen.findByRole('heading', { name: /DEM-2026\/0004/ });
    for (const nome of ['Distribuir', 'Iniciar triagem', 'Concluir triagem']) {
      expect(botao(nome)).not.toBeInTheDocument();
    }
  });

  it('exibe o erro 409 da API no modal sem fechá-lo', async () => {
    server.use(
      http.post('/api/demandas/:id/triagem', () =>
        HttpResponse.json(
          { title: 'Conflito', status: 409, detail: 'Demanda não está em triagem.' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const user = userEvent.setup();
    abrir(2);
    await user.click(await screen.findByRole('button', { name: 'Solicitar complementação' }));
    const modal = await screen.findByRole('dialog');
    await user.type(within(modal).getByLabelText(/^Justificativa/), 'x');
    await user.click(within(modal).getByRole('button', { name: 'Solicitar complementação' }));
    expect(await within(modal).findByRole('alert')).toHaveTextContent(
      'Demanda não está em triagem.',
    );
  });
});

describe('Modal de distribuição', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('só lista os fiscais da equipe selecionada', async () => {
    const user = userEvent.setup();
    abrir(3);
    await user.click(await screen.findByRole('button', { name: 'Distribuir' }));
    const modal = await screen.findByRole('dialog');
    const fiscal = await within(modal).findByLabelText(/^Fiscal/);
    expect(fiscal).toBeDisabled();

    await user.selectOptions(within(modal).getByLabelText(/^Equipe/), '1');
    await waitFor(() => expect(fiscal).toBeEnabled());
    expect(within(fiscal).getByRole('option', { name: 'Fiscal Demonstrativo 1' })).toBeVisible();
    expect(within(fiscal).getByRole('option', { name: 'Fiscal Demonstrativo 2' })).toBeVisible();
    expect(within(fiscal).queryByRole('option', { name: 'Fiscal Demonstrativo 3' })).toBeNull();

    await user.selectOptions(within(modal).getByLabelText(/^Equipe/), '2');
    await waitFor(() =>
      expect(
        within(fiscal).getByRole('option', { name: 'Fiscal Demonstrativo 3' }),
      ).toBeInTheDocument(),
    );
    expect(within(fiscal).queryByRole('option', { name: 'Fiscal Demonstrativo 1' })).toBeNull();
  });

  it('valida campos obrigatórios e prazo no passado', async () => {
    const user = userEvent.setup();
    abrir(3);
    await user.click(await screen.findByRole('button', { name: 'Distribuir' }));
    const modal = await screen.findByRole('dialog');
    await user.click(await within(modal).findByRole('button', { name: 'Distribuir' }));
    expect(within(modal).getByText('Selecione a equipe.')).toBeInTheDocument();
    expect(within(modal).getByText('Selecione o fiscal.')).toBeInTheDocument();
    expect(within(modal).getByText('Informe o prazo.')).toBeInTheDocument();
  });
});
