// Perfis da API. É conveniência de interface: quem autoriza é o backend (403).

/** Perfis que podem cadastrar e editar demandas (POST/PUT /api/demandas). */
export const PERFIS_EDICAO_DEMANDA = ['ADMIN', 'GESTOR', 'ANALISTA'];

/** Status em que a API aceita edição da demanda (nos demais, 409). */
export const STATUS_EDITAVEIS = ['PENDENTE', 'EM_TRIAGEM'];

export function podeEditarDemandas(usuario) {
  return Boolean(usuario) && PERFIS_EDICAO_DEMANDA.includes(usuario.perfil);
}
