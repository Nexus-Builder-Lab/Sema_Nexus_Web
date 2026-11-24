import { explicacaoComparacaoMock } from './fixtures/comparacao.js';
import { preAnaliseMock } from './fixtures/preAnalise.js';
import { painelSistemaMock } from './fixtures/sistema.js';
import { http, HttpResponse } from 'msw';
import { handlersAdmin } from './fixtures/admin.js';
import { handlersNotificacoes } from './fixtures/notificacoes.js';
import { handlersRelatorios } from './fixtures/relatorios.js';
import {
  BIOMAS,
  filtrarPontos,
  handlersFluxDashboard,
  handlersIntelligence,
  handlersReferencia,
} from './fixtures/intelligence.js';
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
  http.get('/api/auth/config', () =>
    HttpResponse.json({
      demo: true,
      perfisDemo: [
        { perfil: 'ADMIN', nome: 'Administrador', descricao: 'Acesso total e administração' },
        { perfil: 'CONSULTA', nome: 'Consulta', descricao: 'Somente leitura' },
      ],
    }),
  ),

  // Existe só no profile `demo` da API (Issue API #83); sem senha no Web.
  http.post('/api/auth/demo/:perfil', ({ params }) =>
    params.perfil === 'ADMIN'
      ? HttpResponse.json({ token: TOKEN_MOCK, expiresIn: 28800, usuario: USUARIO_MOCK })
      : problema(
          404,
          'Não encontrado',
          'Perfil sem usuário demonstrativo ativo.',
          '/api/auth/demo',
        ),
  ),

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
  // Agente de Triagem (Issue API#107): sugestão sem gravar nada; 409 fora de Pendente/Em triagem.
  http.post('/api/demandas/:id/triagem/sugestao', ({ request, params }) => {
    const caminho = `/api/demandas/${params.id}`;
    if (!temToken(request)) return naoAutenticado(caminho);
    const demanda = buscarDemanda(params.id);
    if (!demanda) return problema(404, 'Não encontrado', 'Demanda inexistente.', caminho);
    if (!['PENDENTE', 'EM_TRIAGEM'].includes(demanda.status)) {
      return conflito(
        params.id,
        'A sugestão de triagem só se aplica a demandas Pendentes ou Em triagem.',
      );
    }
    return HttpResponse.json({
      modo: 'LOCAL',
      modelo: 'qwen3:4b-instruct',
      decisao: 'CLASSIFICAR',
      categoria: 'QUEIMADA_INCENDIO',
      prioridade: 'ALTA',
      nucleo: { sigla: 'NR-CBA', nome: 'Núcleo Regional de Cuiabá' },
      justificativa:
        'Relato de queimada em vegetação nativa. Há muitos focos de calor do INPE no município.',
      duplicatas: [
        {
          id: 3,
          numero: 'DEM-2026/0003',
          titulo: 'Fumaça na MT-251',
          status: 'PENDENTE',
          dataRecebimento: '2026-11-10',
          distanciaKm: 2.4,
        },
      ],
      espacial: {
        referencia: 'COORDENADA',
        latitude: -15.6,
        longitude: -56.1,
        raioKm: 10,
        inpe: {
          focosNoRaio: 7,
          focoMaisProximoKm: 1.3,
          alertasDeterNoRaio: 2,
          dentroDePoligonoDeter: true,
          menorDistanciaDeterKm: 0,
          focosMunicipio: 42,
          alertasDeterMunicipio: 3,
          periodoDias: 30,
          truncado: false,
        },
        demandasProximas: [
          {
            id: 3,
            numero: 'DEM-2026/0003',
            titulo: 'Fumaça na MT-251',
            status: 'PENDENTE',
            categoria: 'QUEIMADA_INCENDIO',
            municipio: 'Cuiabá',
            distanciaKm: 2.4,
          },
        ],
        documentos: [{ id: 7, titulo: 'Laudo de queimada 2025', motivo: 'Mesmo município' }],
      },
      evidencias: [
        `Leu a demanda ${demanda.numero}.`,
        'Buscou demandas semelhantes: 0 encontrada(s).',
        'Consultou o INPE no município: 42 foco(s) de calor e 3 alerta(s) de desmatamento.',
      ],
      avisos: [],
    });
  }),
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
  // Pré-análise de documento (API#140): sugere metadados, não grava.
  http.post('/api/documentos/pre-analise', ({ request }) =>
    temToken(request)
      ? HttpResponse.json(preAnaliseMock())
      : naoAutenticado('/api/documentos/pre-analise'),
  ),
  // Explicar impacto das diferenças (API#142): grandezas determinísticas + resumo (demonstrativo nos mocks).
  http.post('/api/docia/comparacao/explicar', async ({ request }) => {
    const caminho = '/api/docia/comparacao/explicar';
    if (!temToken(request)) return naoAutenticado(caminho);
    const { aId, bId } = await request.json();
    if (aId === bId) {
      return problema(400, 'Requisição inválida', 'Selecione dois documentos diferentes.', caminho);
    }
    return HttpResponse.json(explicacaoComparacaoMock(aId, bId));
  }),
  // Visão de satélite (Web#107): sem ESRI_API_KEY nos mocks, o Nginx responderia 404.
  http.head('/tiles/esri/status', () => new HttpResponse(null, { status: 404 })),
  // Agentes de IA (API#106): nos mocks não há IA, os agentes ficam no modo demonstrativo.
  http.get('/api/agentes/status', ({ request }) =>
    temToken(request)
      ? HttpResponse.json({
          modo: 'DEMONSTRATIVO',
          descricao: 'Modo demonstrativo — sugestões por regras locais, sem IA generativa.',
          agentes: [],
        })
      : naoAutenticado('/api/agentes/status'),
  ),
  // Painel do sistema (API#114): somente ADMIN.
  http.get('/api/sistema/painel', ({ request }) => {
    if (!temToken(request)) return naoAutenticado('/api/sistema/painel');
    return HttpResponse.json(painelSistemaMock());
  }),
  ...auth,
  ...handlersAdmin,
  ...handlersNotificacoes,
  ...handlersIntelligence,
  ...handlersFluxDashboard,
  ...handlersReferencia,
  ...handlersRelatorios,
  ...intelligence,
  ...catalogos,
  ...demandas,
  ...fluxo,
  ...semRespostaNoContrato,
  ...criarHandlersDoContrato(),
];
