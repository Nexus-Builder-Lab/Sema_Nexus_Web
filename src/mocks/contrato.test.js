import httpClient from '../api/httpClient.js';
import { saveSession } from '../auth/sessionStore.js';
import openapi from './openapi.json';
import { gerarExemplo, criarHandlersDoContrato } from './contrato.js';
import { TOKEN_MOCK } from './handlers.js';

describe('mocks gerados do contrato OpenAPI', () => {
  it('cria handlers para as operações do contrato com resposta 2xx', () => {
    const operacoesComSucesso = Object.values(openapi.paths)
      .flatMap((ops) => Object.values(ops))
      .filter((op) => Object.keys(op.responses ?? {}).some((c) => c.startsWith('2')));
    expect(criarHandlersDoContrato()).toHaveLength(operacoesComSucesso.length);
  });

  it('gera exemplos a partir dos schemas, com paginação começando em 0', () => {
    const pagina = gerarExemplo({ $ref: '#/components/schemas/PageResponseDemandaResumo' });
    expect(pagina.page).toBe(0);
    expect(Array.isArray(pagina.content)).toBe(true);
    expect(pagina.content[0]).toHaveProperty('numero');
  });

  it('endpoints do contrato exigem token (401) e respondem com ele', async () => {
    await expect(httpClient.get('/catalogos/biomas')).rejects.toMatchObject({
      response: { status: 401 },
    });

    saveSession({ token: TOKEN_MOCK, usuario: {} });
    const { data } = await httpClient.get('/catalogos/biomas');
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('codigo');
  });

  it('endpoints de listagem devolvem página no formato do contrato', async () => {
    saveSession({ token: TOKEN_MOCK, usuario: {} });
    const { data } = await httpClient.get('/demandas');
    expect(data).toMatchObject({ page: 0 });
    expect(data.content.length).toBeGreaterThan(0);
  });

  it('o login dos mocks aceita só a credencial demonstrativa', async () => {
    const ok = await httpClient.post('/auth/login', {
      email: 'admin@admin.com',
      senha: '12345678',
    });
    expect(ok.data).toMatchObject({ token: TOKEN_MOCK, usuario: { perfil: 'ADMIN' } });

    await expect(
      httpClient.post('/auth/login', { email: 'admin@admin.com', senha: 'x' }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    await expect(httpClient.post('/auth/login', { email: '', senha: '' })).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});
