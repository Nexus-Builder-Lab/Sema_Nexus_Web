import httpClient from './httpClient.js';

// Notificações do usuário logado (Issue API#25) e consulta de auditoria, só ADMIN (Issue API#14).

export async function contarNaoLidas() {
  const { data } = await httpClient.get('/notificacoes/nao-lidas/contagem');
  return data.naoLidas;
}

/** Página de notificações, mais recentes primeiro. */
export async function listarNotificacoes({ lida, page = 0, size = 10 } = {}) {
  const params = { page, size };
  if (lida !== undefined && lida !== '') params.lida = lida;
  const { data } = await httpClient.get('/notificacoes', { params });
  return data;
}

export async function marcarLida(id) {
  const { data } = await httpClient.patch(`/notificacoes/${id}/lida`);
  return data;
}

/** Auditoria paginada: `{ de, ate, usuarioId, acao, entidade, page, size }`. */
export async function consultarAuditoria({
  de,
  ate,
  usuarioId,
  acao,
  entidade,
  page = 0,
  size = 20,
} = {}) {
  const params = { page, size };
  if (de) params.de = de;
  if (ate) params.ate = ate;
  if (usuarioId) params.usuarioId = usuarioId;
  if (acao) params.acao = acao.trim();
  if (entidade) params.entidade = entidade.trim();
  const { data } = await httpClient.get('/auditoria', { params });
  return data;
}
