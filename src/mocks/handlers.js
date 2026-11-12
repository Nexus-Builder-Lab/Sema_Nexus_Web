import { http, HttpResponse } from 'msw';
import { handlersAdmin } from './fixtures/admin.js';
import { handlersRelatorios } from './fixtures/relatorios.js';
import { BIOMAS, filtrarPontos, handlersIntelligence } from './fixtures/intelligence.js';
import { criarHandlersDoContrato, exemploDoSchema, problema, temToken } from './contrato.js';
import {
  CATEGORIAS,
  EQUIPES,
  MEMBROS,
  MUNICIPIOS,
  ORIGENS,
  PRIORIDADES,
  STATUS,
} from './fixtures/catalogos.js';
import {
  buscarDemanda,
  cadastrarDemandaMock,
  decidirTriagemMock,
  distribuirMock,
  historicoMock,
  iniciarTriagemMock,
  validarDistribuicaoMock,
  iniciarExecucaoMock,
  registrarAtividadeMock,
  validarAtividadeMock,
  registrarFiscalizacaoMock,
  validarFiscalizacaoMock,
  concluirMock,
  validarConclusaoMock,
  devolverMock,
  validarDevolucaoMock,
  validarTriagemMock,
  editarDemandaMock,
  listarDemandasMock,
  validarCorpoMock,
} from './fixtures/demandas.js';

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

// Catálogos e mapa com fixtures fictícias (o exemplo gerado do contrato traria só 1 item genérico).
const catalogo = (caminho, itens) =>
  http.get(caminho, ({ request }) =>
    temToken(request) ? HttpResponse.json(itens) : naoAutenticado(caminho),
  );

const intelligence = [
  catalogo('/api/catalogos/biomas', BIOMAS),
  http.get('/api/intelligence/mapa', ({ request }) => {
    if (!temToken(request)) return naoAutenticado('/api/intelligence/mapa');
    return HttpResponse.json({
      demonstrativo: true,
      aviso: 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS',
      pontos: filtrarPontos(new URL(request.url).searchParams),
    });
  }),
];

// Operações cujo 200 ainda não consta no contrato publicado (endpoints pendentes na API).
const semRespostaNoContrato = [
  http.get('/api/demandas/:id/documentos', ({ request }) =>
    temToken(request)
      ? HttpResponse.json([exemploDoSchema('DocumentoResumo')])
      : naoAutenticado('/api/demandas'),
  ),
];

// Catálogos e equipes com fixtures fictícias (o gerador do contrato devolve só 1 item).
function comToken(resposta) {
  return ({ request, params }) =>
    temToken(request)
      ? resposta({ request, params })
      : naoAutenticado(new URL(request.url).pathname);
}

const catalogos = [
  http.get(
    '/api/catalogos/status',
    comToken(() => HttpResponse.json(STATUS)),
  ),
  http.get(
    '/api/catalogos/prioridades',
    comToken(() => HttpResponse.json(PRIORIDADES)),
  ),
  http.get(
    '/api/catalogos/categorias',
    comToken(() => HttpResponse.json(CATEGORIAS)),
  ),
  http.get(
    '/api/catalogos/origens',
    comToken(() => HttpResponse.json(ORIGENS)),
  ),
  http.get(
    '/api/catalogos/municipios',
    comToken(() => HttpResponse.json(MUNICIPIOS)),
  ),
  http.get(
    '/api/equipes',
    comToken(() => HttpResponse.json(EQUIPES)),
  ),
  http.get(
    '/api/equipes/:id/membros',
    comToken(({ params }) => {
      const membros = MEMBROS[params.id];
      return membros
        ? HttpResponse.json(membros)
        : problema(
            404,
            'Não encontrado',
            'Equipe inexistente.',
            `/api/equipes/${params.id}/membros`,
          );
    }),
  ),
];

function problemaValidacao(erros, instance) {
  return HttpResponse.json(
    {
      type: 'https://semanexus.demo/problemas/validacao',
      title: 'Dados inválidos',
      status: 400,
      detail: 'Um ou mais campos são inválidos.',
      instance,
      errors: erros,
    },
    { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

// Demandas (Issue API#11): store em memória com filtros, ordenação, paginação, cadastro e edição.
const demandas = [
  http.get(
    '/api/demandas',
    comToken(({ request }) =>
      HttpResponse.json(listarDemandasMock(new URL(request.url).searchParams)),
    ),
  ),

  http.post('/api/demandas', async ({ request }) => {
    if (!temToken(request)) return naoAutenticado('/api/demandas');
    const corpo = await request.json().catch(() => ({}));
    const erros = validarCorpoMock(corpo);
    if (erros.length) return problemaValidacao(erros, '/api/demandas');
    const criada = cadastrarDemandaMock(corpo);
    return HttpResponse.json(criada, {
      status: 201,
      headers: { Location: `/api/demandas/${criada.id}` },
    });
  }),

  http.get(
    '/api/demandas/:id',
    comToken(({ params }) => {
      const demanda = buscarDemanda(params.id);
      return demanda
        ? HttpResponse.json(demanda)
        : problema(404, 'Não encontrado', 'Demanda inexistente.', `/api/demandas/${params.id}`);
    }),
  ),

  http.put('/api/demandas/:id', async ({ request, params }) => {
    if (!temToken(request)) return naoAutenticado(`/api/demandas/${params.id}`);
    const demanda = buscarDemanda(params.id);
    if (!demanda)
      return problema(404, 'Não encontrado', 'Demanda inexistente.', `/api/demandas/${params.id}`);
    const corpo = await request.json().catch(() => ({}));
    const erros = validarCorpoMock(corpo);
    if (erros.length) return problemaValidacao(erros, `/api/demandas/${params.id}`);
    if (!['PENDENTE', 'EM_TRIAGEM'].includes(demanda.status)) {
      return problema(
        409,
        'Conflito',
        'A demanda só pode ser editada em PENDENTE ou EM_TRIAGEM.',
        `/api/demandas/${params.id}`,
      );
    }
    return HttpResponse.json(editarDemandaMock(demanda, corpo));
  }),
];

// Fluxo de triagem e distribuição (Issue API#12): transições em memória com 409 para status inválido.
function conflito(id, detalhe) {
  return problema(409, 'Conflito', detalhe, `/api/demandas/${id}`);
}

function acaoDeFluxo(statusEsperado, aplicar, validar) {
  return async ({ request, params }) => {
    const caminho = `/api/demandas/${params.id}`;
    if (!temToken(request)) return naoAutenticado(caminho);
    const demanda = buscarDemanda(params.id);
    if (!demanda) return problema(404, 'Não encontrado', 'Demanda inexistente.', caminho);
    const corpo = await request.json().catch(() => ({}));
    const erros = validar ? validar(corpo) : [];
    if (erros.length) return problemaValidacao(erros, caminho);
    if (demanda.status !== statusEsperado) {
      return conflito(params.id, `Transição inválida: a demanda está em ${demanda.status}.`);
    }
    return HttpResponse.json(aplicar(demanda, corpo));
  };
}

const fluxo = [
  http.get('/api/demandas/:id/historico', ({ request, params }) => {
    if (!temToken(request)) return naoAutenticado(`/api/demandas/${params.id}`);
    const demanda = buscarDemanda(params.id);
    return demanda
      ? HttpResponse.json(historicoMock(demanda))
      : problema(404, 'Não encontrado', 'Demanda inexistente.', `/api/demandas/${params.id}`);
  }),
  http.post(
    '/api/demandas/:id/triagem/iniciar',
    acaoDeFluxo('PENDENTE', (demanda) => iniciarTriagemMock(demanda)),
  ),
  http.post(
    '/api/demandas/:id/triagem',
    acaoDeFluxo('EM_TRIAGEM', decidirTriagemMock, validarTriagemMock),
  ),
  http.post(
    '/api/demandas/:id/distribuicao',
    acaoDeFluxo('AGUARDANDO_DISTRIBUICAO', distribuirMock, validarDistribuicaoMock),
  ),
  http.post('/api/demandas/:id/inicio', acaoDeFluxo('DISTRIBUIDA', iniciarExecucaoMock)),
  http.post('/api/demandas/:id/atividades', async (info) => {
    const resposta = await acaoDeFluxo(
      'EM_ANDAMENTO',
      registrarAtividadeMock,
      validarAtividadeMock,
    )(info);
    return resposta.status === 200
      ? HttpResponse.json(await resposta.json(), { status: 201 })
      : resposta;
  }),
  http.post(
    '/api/demandas/:id/fiscalizacao',
    acaoDeFluxo('EM_ANDAMENTO', registrarFiscalizacaoMock, validarFiscalizacaoMock),
  ),
  http.post(
    '/api/demandas/:id/conclusao',
    acaoDeFluxo('AGUARDANDO_CONCLUSAO', concluirMock, validarConclusaoMock),
  ),
  http.post(
    '/api/demandas/:id/devolucao',
    acaoDeFluxo('AGUARDANDO_CONCLUSAO', devolverMock, validarDevolucaoMock),
  ),
];

// Handlers específicos primeiro: o MSW usa o primeiro que casar.
export const handlers = [
  ...auth,
  ...handlersAdmin,
  ...handlersIntelligence,
  ...handlersRelatorios,
  ...intelligence,
  ...catalogos,
  ...demandas,
  ...fluxo,
  ...semRespostaNoContrato,
  ...criarHandlersDoContrato(),
];
