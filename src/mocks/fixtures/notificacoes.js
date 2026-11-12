// Notificações e auditoria fictícias dos mocks (contratos das Issues API#25 e API#14), com store em memória.
import { http, HttpResponse } from 'msw';
import { problema, temToken } from '../contrato.js';

let notificacoes;
let auditoria;

export function resetNotificacoesMock() {
  notificacoes = [
    {
      id: 1,
      tipo: 'DISTRIBUICAO',
      titulo: 'Demanda distribuída',
      mensagem: 'A demanda DEM-0001 foi distribuída para você (dados fictícios).',
      demandaId: 1,
      lida: false,
      criadaEm: '2026-11-10T09:30:00',
      lidaEm: null,
    },
    {
      id: 2,
      tipo: 'PRAZO_PROXIMO',
      titulo: 'Prazo próximo',
      mensagem: 'A demanda DEM-0002 vence em 2 dias (dados fictícios).',
      demandaId: 2,
      lida: false,
      criadaEm: '2026-11-09T14:00:00',
      lidaEm: null,
    },
    {
      id: 3,
      tipo: 'NOVA_DEMANDA',
      titulo: 'Nova demanda',
      mensagem: 'Uma nova demanda foi registrada (dados fictícios).',
      demandaId: null,
      lida: true,
      criadaEm: '2026-11-08T08:00:00',
      lidaEm: '2026-11-08T08:30:00',
    },
  ];
  auditoria = [
    ['2026-11-10T09:30:00', 1, 'Administrador Demonstrativo', 'DISTRIBUIR', 'DEMANDA', '1'],
    ['2026-11-09T11:00:00', 1, 'Administrador Demonstrativo', 'CRIAR', 'USUARIO', '4'],
    ['2026-11-08T08:00:00', 1, 'Administrador Demonstrativo', 'LOGIN', 'USUARIO', '1'],
    ['2026-11-07T16:45:00', 2, 'Gestor Demonstrativo', 'ATUALIZAR', 'DEMANDA', '2'],
  ].map(([data, usuarioId, usuarioNome, acao, entidade, entidadeId], i) => ({
    id: i + 1,
    data,
    usuarioId,
    usuarioNome,
    acao,
    entidade,
    entidadeId,
    detalhe: 'Registro fictício de demonstração.',
  }));
}
resetNotificacoesMock();

function pagina(todos, url) {
  const page = Number(url.searchParams.get('page') ?? 0);
  const size = Number(url.searchParams.get('size') ?? 20);
  return HttpResponse.json({
    content: todos.slice(page * size, page * size + size),
    page,
    size,
    totalElements: todos.length,
    totalPages: Math.ceil(todos.length / size),
  });
}

const naoAutenticado = (request) =>
  problema(401, 'Não autenticado', 'Autenticação necessária.', new URL(request.url).pathname);

export const handlersNotificacoes = [
  http.get('/api/notificacoes/nao-lidas/contagem', ({ request }) =>
    temToken(request)
      ? HttpResponse.json({ naoLidas: notificacoes.filter((n) => !n.lida).length })
      : naoAutenticado(request),
  ),
  http.get('/api/notificacoes', ({ request }) => {
    if (!temToken(request)) return naoAutenticado(request);
    const url = new URL(request.url);
    const lida = url.searchParams.get('lida');
    return pagina(
      notificacoes.filter((n) => lida == null || String(n.lida) === lida),
      url,
    );
  }),
  http.patch('/api/notificacoes/:id/lida', ({ request, params }) => {
    if (!temToken(request)) return naoAutenticado(request);
    const n = notificacoes.find((x) => String(x.id) === params.id);
    if (!n)
      return problema(
        404,
        'Não encontrada',
        'Notificação inexistente.',
        new URL(request.url).pathname,
      );
    if (!n.lida) {
      n.lida = true;
      n.lidaEm = new Date().toISOString().slice(0, 19);
    }
    return HttpResponse.json(n);
  }),
  http.get('/api/auditoria', ({ request }) => {
    if (!temToken(request)) return naoAutenticado(request);
    const url = new URL(request.url);
    const p = (k) => url.searchParams.get(k);
    const igual = (a, b) => !b || String(a).toLowerCase() === b.toLowerCase();
    const todos = auditoria.filter(
      (r) =>
        (!p('de') || r.data.slice(0, 10) >= p('de')) &&
        (!p('ate') || r.data.slice(0, 10) <= p('ate')) &&
        (!p('usuarioId') || String(r.usuarioId) === p('usuarioId')) &&
        igual(r.acao, p('acao')) &&
        igual(r.entidade, p('entidade')),
    );
    return pagina(todos, url);
  }),
];
