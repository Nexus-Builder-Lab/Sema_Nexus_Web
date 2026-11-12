import httpClient from './httpClient.js';

// Administração (Issue API#24). Consulta: ADMIN e GESTOR; escrita: somente ADMIN (403 nos demais).

/** Usuários paginados: `{ content, page, size, totalElements, totalPages }`. */
export async function listarUsuarios({ q, perfil, ativo, page = 0, size = 20 } = {}) {
  const params = { page, size };
  if (q) params.q = q;
  if (perfil) params.perfil = perfil;
  if (ativo !== '' && ativo != null) params.ativo = ativo;
  const { data } = await httpClient.get('/usuarios', { params });
  return data;
}

export async function criarUsuario(corpo) {
  const { data } = await httpClient.post('/usuarios', corpo);
  return data;
}

export async function atualizarUsuario(id, corpo) {
  const { data } = await httpClient.put(`/usuarios/${id}`, corpo);
  return data;
}

export async function alterarAtivacao(id, ativo) {
  const { data } = await httpClient.patch(`/usuarios/${id}/ativacao`, { ativo });
  return data;
}

export async function listarSetores() {
  const { data } = await httpClient.get('/setores');
  return data;
}

export async function criarSetor(corpo) {
  const { data } = await httpClient.post('/setores', corpo);
  return data;
}

export async function atualizarSetor(id, corpo) {
  const { data } = await httpClient.put(`/setores/${id}`, corpo);
  return data;
}

export async function criarEquipe(corpo) {
  const { data } = await httpClient.post('/equipes', corpo);
  return data;
}

export async function atualizarEquipe(id, corpo) {
  const { data } = await httpClient.put(`/equipes/${id}`, corpo);
  return data;
}

/** Substitui os membros: `{ usuarioIds: number[], responsavelId?: number }`. */
export async function substituirMembros(equipeId, corpo) {
  const { data } = await httpClient.put(`/equipes/${equipeId}/membros`, corpo);
  return data;
}
