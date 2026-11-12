import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App.jsx';
import { server } from '../../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../../test/auth.js';
import { validarUsuario } from './validarAdmin.js';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

const linhaDe = (texto) => screen.getByRole('row', { name: new RegExp(texto) });

describe('validarUsuario', () => {
  const base = { nome: 'Ana', email: 'ana@demo.local', senha: '12345678', perfil: 'FISCAL' };
  it('exige senha de no mínimo 8 caracteres no cadastro', () => {
    expect(validarUsuario({ ...base, senha: '1234567' }, { criando: true }).senha).toMatch(/8/);
    expect(validarUsuario({ ...base, senha: '' }, { criando: true }).senha).toBeTruthy();
    expect(validarUsuario(base, { criando: true })).toEqual({});
  });
  it('na edição a senha é opcional, mas se preenchida precisa de 8', () => {
    expect(validarUsuario({ ...base, senha: '' }, { criando: false })).toEqual({});
    expect(validarUsuario({ ...base, senha: 'curta' }, { criando: false }).senha).toBeTruthy();
  });
});

describe('Administração: acesso', () => {
  it('perfis que não são ADMIN veem acesso negado e nenhum item no menu', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'GESTOR' });
    renderAt('/admin/usuarios');
    expect(
      await screen.findByRole('heading', { name: /acesso negado|sem permissão/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('Usuários', () => {
  beforeEach(() => iniciarSessao());

  it('lista, pesquisa e filtra por perfil', async () => {
    const user = userEvent.setup();
    renderAt('/admin/usuarios');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    await screen.findByRole('table', { name: /lista de usuários/i });
    expect(linhaDe('Gestor Demonstrativo')).toBeInTheDocument();
    expect(linhaDe('Fiscal Demonstrativo 1')).toHaveTextContent('Equipe Alfa');

    await user.selectOptions(screen.getByLabelText('Perfil'), 'FISCAL');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(screen.queryByText('Gestor Demonstrativo')).not.toBeInTheDocument());
    expect(screen.getByText('Fiscal Demonstrativo 2')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/pesquisar por nome/i), 'inexistente');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText('Nenhum usuário encontrado')).toBeInTheDocument();
  });

  it('mostra erro com nova tentativa quando a API falha', async () => {
    server.use(
      http.get('/api/usuarios', () =>
        HttpResponse.json({ title: 'Erro', detail: 'Falha simulada.' }, { status: 500 }),
      ),
    );
    renderAt('/admin/usuarios');
    expect(await screen.findByText('Não foi possível carregar os usuários')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('valida a senha (mínimo 8) antes de enviar', async () => {
    const user = userEvent.setup();
    renderAt('/admin/usuarios');
    await screen.findByRole('table', { name: /lista de usuários/i });
    await user.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const dialogo = screen.getByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/^Nome/), 'Novo Fiscal');
    await user.type(within(dialogo).getByLabelText(/^E-mail/), 'novo@demo.semanexus.local');
    await user.selectOptions(within(dialogo).getByLabelText(/^Perfil/), 'FISCAL');
    await user.type(within(dialogo).getByLabelText(/^Senha/), '1234567');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(
      await within(dialogo).findByText(/no mínimo 8 caracteres/i, {
        selector: '.invalid-feedback',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Novo Fiscal', { selector: 'td' })).not.toBeInTheDocument();
  });

  it('cadastra um fiscal com equipe e ele aparece na distribuição (membros da equipe)', async () => {
    const user = userEvent.setup();
    renderAt('/admin/usuarios');
    await screen.findByRole('table', { name: /lista de usuários/i });
    await user.click(screen.getByRole('button', { name: 'Novo usuário' }));
    const dialogo = screen.getByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/^Nome/), 'Novo Fiscal');
    await user.type(within(dialogo).getByLabelText(/^E-mail/), 'novo@demo.semanexus.local');
    await user.type(within(dialogo).getByLabelText(/^Senha/), '12345678');
    await user.selectOptions(within(dialogo).getByLabelText(/^Perfil/), 'FISCAL');
    await user.selectOptions(within(dialogo).getByLabelText('Equipe'), '2');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Usuário cadastrado com sucesso.')).toBeInTheDocument();
    await waitFor(() => expect(linhaDe('Novo Fiscal')).toHaveTextContent('Equipe Bravo'));

    // A distribuição consome os membros da equipe: o novo fiscal consta nela.
    const resp = await fetch('/api/equipes/2/membros', {
      headers: {
        Authorization:
          'Bearer ' + JSON.parse(sessionStorage.getItem(Object.keys(sessionStorage)[0])).token,
      },
    });
    const membros = await resp.json();
    expect(membros.map((m) => m.nome)).toContain('Novo Fiscal');
  });

  it('pede confirmação antes de desativar e só desativa ao confirmar', async () => {
    const user = userEvent.setup();
    renderAt('/admin/usuarios');
    await screen.findByRole('table', { name: /lista de usuários/i });

    await user.click(screen.getByRole('button', { name: 'Desativar Fiscal Demonstrativo 3' }));
    const confirmacao = screen.getByRole('dialog', { name: 'Desativar usuário' });
    await user.click(within(confirmacao).getByRole('button', { name: 'Cancelar' }));
    expect(linhaDe('Fiscal Demonstrativo 3')).toHaveTextContent('Ativo');

    await user.click(screen.getByRole('button', { name: 'Desativar Fiscal Demonstrativo 3' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Desativar usuário' })).getByRole('button', {
        name: 'Desativar',
      }),
    );
    expect(await screen.findByText('Usuário desativado.')).toBeInTheDocument();
    await waitFor(() => expect(linhaDe('Fiscal Demonstrativo 3')).toHaveTextContent('Inativo'));
    expect(
      screen.getByRole('button', { name: 'Ativar Fiscal Demonstrativo 3' }),
    ).toBeInTheDocument();
  });

  it('exibe o erro da API (409) ao desativar o último administrador', async () => {
    const user = userEvent.setup();
    renderAt('/admin/usuarios');
    await screen.findByRole('table', { name: /lista de usuários/i });
    await user.click(screen.getByRole('button', { name: 'Desativar Administrador Demonstrativo' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Desativar usuário' })).getByRole('button', {
        name: 'Desativar',
      }),
    );
    expect(await screen.findByText(/último administrador/i)).toBeInTheDocument();
  });

  it('edita um usuário', async () => {
    const user = userEvent.setup();
    renderAt('/admin/usuarios');
    await screen.findByRole('table', { name: /lista de usuários/i });
    await user.click(screen.getByRole('button', { name: 'Editar Gestor Demonstrativo' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar usuário' });
    const nome = within(dialogo).getByLabelText(/^Nome/);
    await user.clear(nome);
    await user.type(nome, 'Gestora Renomeada');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Usuário atualizado.')).toBeInTheDocument();
    expect(await screen.findByText('Gestora Renomeada')).toBeInTheDocument();
  });
});

describe('Setores e equipes', () => {
  beforeEach(() => iniciarSessao());

  it('lista setores e equipes com responsável e membros', async () => {
    renderAt('/admin/estrutura');
    await screen.findByRole('table', { name: /lista de equipes/i });
    expect(screen.getByRole('table', { name: /lista de setores/i })).toHaveTextContent('DEMO-FISC');
    expect(linhaDe('Equipe Alfa')).toHaveTextContent('DEMO-FISC');
  });

  it('cadastra setor e equipe com responsável', async () => {
    const user = userEvent.setup();
    renderAt('/admin/estrutura');
    await screen.findByRole('table', { name: /lista de equipes/i });

    await user.click(screen.getByRole('button', { name: 'Novo setor' }));
    let dialogo = screen.getByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/^Sigla/), 'demo-novo');
    await user.type(within(dialogo).getByLabelText(/^Nome/), 'Setor Novo (demonstração)');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Setor cadastrado com sucesso.')).toBeInTheDocument();
    expect(await screen.findByText('DEMO-NOVO')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nova equipe' }));
    dialogo = screen.getByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialogo).findByText('Informe o nome.')).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione o setor.')).toBeInTheDocument();
    await user.type(within(dialogo).getByLabelText(/^Nome/), 'Equipe Delta (demonstração)');
    await user.selectOptions(
      within(dialogo).getByLabelText(/^Setor/),
      'DEMO-NOVO — Setor Novo (demonstração)',
    );
    await user.selectOptions(within(dialogo).getByLabelText('Responsável'), 'Gestor Demonstrativo');
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Equipe cadastrada com sucesso.')).toBeInTheDocument();
    const linha = await screen.findByRole('row', { name: /Equipe Delta/ });
    expect(linha).toHaveTextContent('Gestor Demonstrativo');
    expect(linha).toHaveTextContent('DEMO-NOVO');
  });

  it('atualiza os membros e o responsável de uma equipe', async () => {
    const user = userEvent.setup();
    renderAt('/admin/estrutura');
    await screen.findByRole('table', { name: /lista de equipes/i });
    await user.click(
      screen.getByRole('button', { name: 'Membros de Equipe Bravo (demonstração)' }),
    );
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByLabelText(/Fiscal Demonstrativo 3/)).toBeChecked();
    await user.click(within(dialogo).getByLabelText(/Fiscal Demonstrativo 1/));
    await user.selectOptions(
      within(dialogo).getByLabelText('Responsável'),
      'Fiscal Demonstrativo 1',
    );
    await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Membros da equipe atualizados.')).toBeInTheDocument();
    await waitFor(() => {
      const linha = linhaDe('Equipe Bravo');
      expect(linha).toHaveTextContent('Fiscal Demonstrativo 1');
      expect(linha).toHaveTextContent('2');
    });
  });
});
