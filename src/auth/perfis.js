// Perfis da API. É conveniência de interface: quem autoriza é o backend (403).

/** Perfis que podem cadastrar e editar demandas (POST/PUT /api/demandas). */
export const PERFIS_EDICAO_DEMANDA = ['ADMIN', 'GESTOR', 'ANALISTA'];

/** Status em que a API aceita edição da demanda (nos demais, 409). */
export const STATUS_EDITAVEIS = ['PENDENTE', 'EM_TRIAGEM'];

export function podeEditarDemandas(usuario) {
  return Boolean(usuario) && PERFIS_EDICAO_DEMANDA.includes(usuario.perfil);
}

/** Perfis que fazem a triagem (iniciar, concluir ou solicitar complementação). */
export const PERFIS_TRIAGEM = ['ADMIN', 'GESTOR', 'ANALISTA'];

/** Perfis que distribuem demandas a equipe e fiscal. */
export const PERFIS_DISTRIBUICAO = ['ADMIN', 'GESTOR'];

export const podeTriar = (usuario) => Boolean(usuario) && PERFIS_TRIAGEM.includes(usuario.perfil);
export const podeDistribuir = (usuario) =>
  Boolean(usuario) && PERFIS_DISTRIBUICAO.includes(usuario.perfil);

/**
 * Ações de fluxo disponíveis para o status e o perfil (transição válida + perfil permitido).
 * Conveniência de interface: a API é quem autoriza (403) e valida a transição (409).
 */
export function acoesDisponiveis(status, usuario) {
  const acoes = [];
  if (status === 'PENDENTE' && podeTriar(usuario)) acoes.push('INICIAR_TRIAGEM');
  if (status === 'EM_TRIAGEM' && podeTriar(usuario)) {
    acoes.push('CONCLUIR_TRIAGEM', 'SOLICITAR_COMPLEMENTACAO');
  }
  if (status === 'AGUARDANDO_DISTRIBUICAO' && podeDistribuir(usuario)) acoes.push('DISTRIBUIR');
  return acoes;
}
