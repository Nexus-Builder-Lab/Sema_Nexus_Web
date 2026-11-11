import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import App from '../App.jsx';
import httpClient from '../api/httpClient.js';
import { server } from '../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../test/auth.js';
import AuthProvider from './AuthProvider.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequireRole from './RequireRole.jsx';
import { SESSION_KEY } from './sessionStore.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function LocalAtual() {
  const { pathname, search } = useLocation();
  return <span data-testid="local">{`${pathname}${search}`}</span>;
}

async function preencherEEnviar(user, email, senha) {
  if (email) await user.type(screen.getByLabelText('E-mail'), email);
  if (senha) await user.type(screen.getByLabelText('Senha'), senha);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('Login', () => {
  it('sem sessão, qualquer rota protegida leva ao login', async () => {
    renderAt('/flux/demandas');
    expect(await screen.findByRole('heading', { name: 'SEMA NEXUS' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Menu principal' })).not.toBeInTheDocument();
  });

  it('mostra a faixa demonstrativa e não pré-preenche as credenciais', async () => {
    renderAt('/login');
    expect(screen.getByRole('note', { name: /ambiente demonstrativo/i })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  it('autentica com sucesso e volta para a rota que o usuário tentou abrir', async () => {
    const user = userEvent.setup();
    renderAt('/rota-inexistente?origem=teste');
    await screen.findByLabelText('E-mail');

    await preencherEEnviar(user, 'admin@admin.com', '12345678');

    // Rota pedida (inexistente → 404 dentro do layout autenticado, provando o retorno à rota).
    expect(
      await screen.findByRole('heading', { name: 'Página não encontrada' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Menu principal' })).toBeInTheDocument();
    expect(screen.getByText('Administrador Demonstrativo')).toBeInTheDocument();
  });

  it('guarda a sessão em sessionStorage e nada em localStorage', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await preencherEEnviar(user, 'admin@admin.com', '12345678');
    await screen.findByRole('heading', { name: 'SEMA NEXUS', level: 1 });

    const guardado = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    expect(guardado.token).toBeTruthy();
    expect(guardado.usuario.perfil).toBe('ADMIN');
    expect(localStorage.length).toBe(0);
  });

  it('credencial inválida mostra mensagem de erro e permanece no login', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await preencherEEnviar(user, 'admin@admin.com', 'senha-errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('valida os campos antes de chamar a API', async () => {
    const user = userEvent.setup();
    let chamadas = 0;
    server.use(
      http.post('/api/auth/login', () => {
        chamadas += 1;
        return HttpResponse.json({});
      }),
    );
    renderAt('/login');

    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('E-mail'), 'isto-nao-e-email');
    await user.type(screen.getByLabelText('Senha'), '12345678');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(chamadas).toBe(0);
  });

  it('mostra o estado de carregamento enquanto autentica', async () => {
    const user = userEvent.setup();
    let liberar;
    server.use(
      http.post('/api/auth/login', async () => {
        await new Promise((resolve) => {
          liberar = resolve;
        });
        return HttpResponse.json({ token: 'tk', expiresIn: 1, usuario: USUARIO_ADMIN });
      }),
    );
    renderAt('/login');
    await preencherEEnviar(user, 'admin@admin.com', '12345678');

    const botao = await screen.findByRole('button', { name: /entrando/i });
    expect(botao).toBeDisabled();
    liberar();
    await screen.findByRole('heading', { name: 'SEMA NEXUS', level: 1 });
  });

  it('mostra mensagem para usuário inativo (403) e para falha de rede', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json(
          { title: 'Proibido', status: 403 },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    renderAt('/login');
    await preencherEEnviar(user, 'admin@admin.com', '12345678');
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário inativo');

    server.use(http.post('/api/auth/login', () => HttpResponse.error()));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível conectar'),
    );
  });

  it('exibe o aviso com o usuário de teste só quando /api/auth/config indica demo: true', async () => {
    renderAt('/login');
    expect(
      await screen.findByText(
        'Ambiente demonstrativo — dados fictícios. Usuário de teste: admin@admin.com',
      ),
    ).toBeInTheDocument();
  });

  it('não exibe a credencial quando demo é false', async () => {
    let consultou = false;
    server.use(
      http.get('/api/auth/config', () => {
        consultou = true;
        return HttpResponse.json({ demo: false });
      }),
    );
    renderAt('/login');
    await waitFor(() => expect(consultou).toBe(true));
    // aguarda o estado assentar
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText(/Usuário de teste/)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin@admin\.com/)).not.toBeInTheDocument();
  });

  it('usuário já autenticado que abre /login é levado ao início', async () => {
    iniciarSessao();
    renderAt('/login');
    expect(
      await screen.findByRole('heading', { name: 'SEMA NEXUS', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Menu principal' })).toBeInTheDocument();
  });
});

describe('Logout e sessão expirada', () => {
  it('chama /api/auth/logout, limpa a sessão e volta ao login', async () => {
    const user = userEvent.setup();
    iniciarSessao();
    let logoutChamado = false;
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/api/auth/logout')) logoutChamado = true;
    });
    renderAt('/');

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByLabelText('E-mail')).toBeInTheDocument();
    expect(logoutChamado).toBe(true);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    server.events.removeAllListeners();
  });

  it('401 em uma rota autenticada (token expirado) leva ao login com aviso', async () => {
    const user = userEvent.setup();
    iniciarSessao();
    function TelaQueConsulta() {
      return (
        <button type="button" onClick={() => httpClient.get('/catalogos/biomas').catch(() => {})}>
          Consultar
        </button>
      );
    }
    server.use(
      http.get('/api/catalogos/biomas', () =>
        HttpResponse.json(
          { title: 'Não autenticado', status: 401 },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/protegida']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<span>tela de login</span>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/protegida" element={<TelaQueConsulta />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(await screen.findByText('tela de login')).toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('mostra "sessão expirou" na tela de login depois de um 401', async () => {
    const user = userEvent.setup();
    iniciarSessao();
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ status: 401 }, { status: 401 })));
    function Consulta() {
      return (
        <button type="button" onClick={() => httpClient.get('/auth/me').catch(() => {})}>
          Consultar
        </button>
      );
    }
    // Reaproveita o App: injeta a tela de teste na rota protegida via rota extra.
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <Consulta />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  function Arvore({ inicial }) {
    return (
      <MemoryRouter initialEntries={[inicial]}>
        <AuthProvider>
          <LocalAtual />
          <Routes>
            <Route path="/login" element={<span>login</span>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/privada" element={<span>conteúdo privado</span>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('redireciona para /login sem sessão', () => {
    render(<Arvore inicial="/privada" />);
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.getByTestId('local')).toHaveTextContent('/login');
    expect(screen.queryByText('conteúdo privado')).not.toBeInTheDocument();
  });

  it('renderiza o conteúdo com sessão', () => {
    iniciarSessao();
    render(<Arvore inicial="/privada" />);
    expect(screen.getByText('conteúdo privado')).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  function Arvore({ perfil, roles }) {
    iniciarSessao({ ...USUARIO_ADMIN, perfil });
    return (
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<RequireRole roles={roles} />}>
                <Route path="/admin" element={<span>área restrita</span>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('permite o perfil autorizado', () => {
    render(<Arvore perfil="GESTOR" roles={['ADMIN', 'GESTOR']} />);
    expect(screen.getByText('área restrita')).toBeInTheDocument();
  });

  it('mostra "Acesso negado" para perfil sem permissão', () => {
    render(<Arvore perfil="CONSULTA" roles={['ADMIN', 'GESTOR']} />);
    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
    expect(screen.queryByText('área restrita')).not.toBeInTheDocument();
  });
});
