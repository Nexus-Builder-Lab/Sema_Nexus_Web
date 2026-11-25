import { http, HttpResponse } from 'msw';
import { saveSession } from '../auth/sessionStore.js';
import { server } from '../mocks/server.js';
import httpClient, {
  mensagemDeErro,
  mensagemDeLimite,
  segundosDeEspera,
  setUnauthorizedHandler,
} from './httpClient.js';

describe('httpClient', () => {
  it('usa baseURL relativa /api', () => {
    expect(httpClient.defaults.baseURL).toBe('/api');
  });

  it('injeta o token Bearer quando há sessão', async () => {
    let cabecalho = null;
    server.use(
      http.get('/api/ping', ({ request }) => {
        cabecalho = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    saveSession({ token: 'abc', usuario: { nome: 'X' } });
    await httpClient.get('/ping');
    expect(cabecalho).toBe('Bearer abc');
  });

  it('não envia Authorization sem sessão', async () => {
    let cabecalho = 'inicial';
    server.use(
      http.get('/api/ping', ({ request }) => {
        cabecalho = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    await httpClient.get('/ping');
    expect(cabecalho).toBeNull();
  });

  it('chama o tratador de 401 quando há sessão e rejeita a promessa', async () => {
    const aoExpirar = vi.fn();
    const remover = setUnauthorizedHandler(aoExpirar);
    server.use(http.get('/api/ping', () => HttpResponse.json({}, { status: 401 })));
    saveSession({ token: 'expirado', usuario: {} });

    await expect(httpClient.get('/ping')).rejects.toMatchObject({ response: { status: 401 } });
    expect(aoExpirar).toHaveBeenCalledTimes(1);
    remover();
  });

  it('não trata como sessão expirada o 401 do próprio login nem 401 sem sessão', async () => {
    const aoExpirar = vi.fn();
    const remover = setUnauthorizedHandler(aoExpirar);
    server.use(
      http.get('/api/ping', () => HttpResponse.json({}, { status: 401 })),
      http.post('/api/auth/login', () => HttpResponse.json({}, { status: 401 })),
    );

    await expect(httpClient.get('/ping')).rejects.toBeTruthy(); // sem sessão
    saveSession({ token: 'valido', usuario: {} });
    await expect(httpClient.post('/auth/login', {})).rejects.toBeTruthy();
    expect(aoExpirar).not.toHaveBeenCalled();
    remover();
  });

  it('403 e 500 não derrubam a sessão', async () => {
    const aoExpirar = vi.fn();
    const remover = setUnauthorizedHandler(aoExpirar);
    server.use(
      http.get('/api/proibido', () => HttpResponse.json({}, { status: 403 })),
      http.get('/api/quebrado', () => HttpResponse.json({}, { status: 500 })),
    );
    saveSession({ token: 'valido', usuario: {} });
    await expect(httpClient.get('/proibido')).rejects.toBeTruthy();
    await expect(httpClient.get('/quebrado')).rejects.toBeTruthy();
    expect(aoExpirar).not.toHaveBeenCalled();
    remover();
  });
});

describe('mensagemDeErro', () => {
  it('prioriza a mensagem do primeiro campo, depois detail e title', () => {
    const comCampos = {
      response: { data: { errors: [{ campo: 'titulo', mensagem: 'Título obrigatório' }] } },
    };
    expect(mensagemDeErro(comCampos)).toBe('Título obrigatório');
    expect(mensagemDeErro({ response: { data: { detail: 'Detalhe', title: 'T' } } })).toBe(
      'Detalhe',
    );
    expect(mensagemDeErro({ response: { data: { title: 'Título' } } })).toBe('Título');
    expect(mensagemDeErro({ response: { data: {} } }, 'padrão')).toBe('padrão');
  });

  it('informa falha de conexão quando não há resposta', () => {
    expect(mensagemDeErro(new Error('Network Error'))).toMatch(/conectar ao servidor/);
  });
});

describe('limite de requisições (429)', () => {
  it('lê os segundos do corpo problem+json (retryAfterSegundos) antes do cabeçalho', async () => {
    server.use(
      http.post('/api/ia/teste', () =>
        HttpResponse.json(
          { status: 429, retryAfterSegundos: 42, categoria: 'IA' },
          {
            status: 429,
            headers: { 'Retry-After': '99', 'Content-Type': 'application/problem+json' },
          },
        ),
      ),
    );
    const erro = await httpClient.post('/ia/teste', {}).catch((e) => e);
    expect(segundosDeEspera(erro)).toBe(42);
    expect(mensagemDeErro(erro)).toBe('Muitas solicitações. Tente novamente em 42 s.');
  });

  it('usa o cabeçalho Retry-After quando o corpo não traz o valor', async () => {
    server.use(
      http.get('/api/ping', () =>
        HttpResponse.json({}, { status: 429, headers: { 'Retry-After': '7' } }),
      ),
    );
    const erro = await httpClient.get('/ping').catch((e) => e);
    expect(segundosDeEspera(erro)).toBe(7);
  });

  it('sem valor algum, a mensagem não traz número', async () => {
    server.use(http.get('/api/ping', () => HttpResponse.json({}, { status: 429 })));
    const erro = await httpClient.get('/ping').catch((e) => e);
    expect(segundosDeEspera(erro)).toBeNull();
    expect(mensagemDeErro(erro)).toBe(mensagemDeLimite(null));
    expect(mensagemDeLimite(null)).toBe('Muitas solicitações. Tente novamente em instantes.');
  });

  it('não devolve espera para outros status nem para erros sem resposta', () => {
    expect(
      segundosDeEspera({ response: { status: 500, data: { retryAfterSegundos: 5 } } }),
    ).toBeNull();
    expect(segundosDeEspera(new Error('Network Error'))).toBeNull();
  });

  it('429 nunca encerra a sessão (só o 401 chama o tratador)', async () => {
    const aoExpirar = vi.fn();
    const remover = setUnauthorizedHandler(aoExpirar);
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ retryAfterSegundos: 30 }, { status: 429 }),
      ),
    );
    saveSession({ token: 'valido', usuario: {} });
    await expect(httpClient.post('/auth/login', {})).rejects.toMatchObject({
      response: { status: 429 },
    });
    expect(aoExpirar).not.toHaveBeenCalled();
    remover();
  });
});

describe('429 em rota protegida', () => {
  it('não chama o tratador de sessão expirada', async () => {
    const aoExpirar = vi.fn();
    const remover = setUnauthorizedHandler(aoExpirar);
    server.use(
      http.get('/api/demandas', () =>
        HttpResponse.json({ retryAfterSegundos: 9 }, { status: 429 }),
      ),
    );
    saveSession({ token: 'valido', usuario: {} });
    const erro = await httpClient.get('/demandas').catch((e) => e);
    expect(segundosDeEspera(erro)).toBe(9);
    expect(aoExpirar).not.toHaveBeenCalled();
    remover();
  });
});
