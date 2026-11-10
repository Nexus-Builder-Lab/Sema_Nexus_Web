import { http, HttpResponse } from 'msw';
import { criarHandlersDoContrato, exemploDoSchema, problema, temToken } from './contrato.js';

// Usuário de teste fictício dos mocks (o mesmo da demonstração da API).
const USUARIO_MOCK = {
  id: 1,
  nome: 'Administrador Demonstrativo',
  email: 'admin@admin.com',
  perfil: 'ADMIN',
};
const SENHA_MOCK = '12345678';
export const TOKEN_MOCK = 'mock-token-demonstrativo';

function usuarioDoToken(request) {
  const valor = request.headers.get('Authorization') ?? '';
  return valor === `Bearer ${TOKEN_MOCK}` ? USUARIO_MOCK : null;
}

const naoAutenticado = (instance) =>
  problema(401, 'Não autenticado', 'Token ausente ou inválido.', instance);

// Autenticação: o contrato não documenta a resposta 200 do login, então ela é escrita aqui
// (corpo `{ token, expiresIn, usuario }`, conforme docs/API.md da API).
const auth = [
  http.get('/api/auth/config', () => HttpResponse.json({ demo: true })),

  http.post('/api/auth/login', async ({ request }) => {
    const corpo = await request.json().catch(() => ({}));
    const email = typeof corpo?.email === 'string' ? corpo.email.trim() : '';
    const senha = typeof corpo?.senha === 'string' ? corpo.senha : '';
    if (!email || !senha) {
      return HttpResponse.json(
        {
          type: 'https://semanexus.demo/problemas/validacao',
          title: 'Dados inválidos',
          status: 400,
          detail: 'Um ou mais campos são inválidos.',
          errors: [
            ...(email ? [] : [{ campo: 'email', mensagem: 'Informe o e-mail.' }]),
            ...(senha ? [] : [{ campo: 'senha', mensagem: 'Informe a senha.' }]),
          ],
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      );
    }
    if (email.toLowerCase() !== USUARIO_MOCK.email || senha !== SENHA_MOCK) {
      return problema(401, 'Não autenticado', 'E-mail ou senha inválidos.', '/api/auth/login');
    }
    return HttpResponse.json({ token: TOKEN_MOCK, expiresIn: 28800, usuario: USUARIO_MOCK });
  }),

  http.post('/api/auth/logout', ({ request }) =>
    usuarioDoToken(request)
      ? new HttpResponse(null, { status: 204 })
      : naoAutenticado('/api/auth/logout'),
  ),

  http.get('/api/auth/me', ({ request }) => {
    const usuario = usuarioDoToken(request);
    return usuario ? HttpResponse.json(usuario) : naoAutenticado('/api/auth/me');
  }),
];

// Operações cujo 200 ainda não consta no contrato publicado (endpoints pendentes na API).
const semRespostaNoContrato = [
  http.get('/api/demandas/:id', ({ request }) =>
    temToken(request)
      ? HttpResponse.json(exemploDoSchema('DemandaDetalhe'))
      : naoAutenticado('/api/demandas'),
  ),
  http.get('/api/demandas/:id/historico', ({ request }) =>
    temToken(request)
      ? HttpResponse.json([exemploDoSchema('HistoricoItem')])
      : naoAutenticado('/api/demandas'),
  ),
  http.get('/api/demandas/:id/documentos', ({ request }) =>
    temToken(request)
      ? HttpResponse.json([exemploDoSchema('DocumentoResumo')])
      : naoAutenticado('/api/demandas'),
  ),
];

// Handlers específicos primeiro: o MSW usa o primeiro que casar.
export const handlers = [...auth, ...semRespostaNoContrato, ...criarHandlersDoContrato()];
