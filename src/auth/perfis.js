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

/** Perfis que encerram a fiscalização (concluir ou devolver). */
export const PERFIS_CONCLUSAO = ['ADMIN', 'GESTOR'];
export const podeConcluir = (usuario) =>
  Boolean(usuario) && PERFIS_CONCLUSAO.includes(usuario.perfil);

/** Executa a fiscalização: ADMIN/GESTOR, ou o FISCAL designado na demanda. */
export function podeExecutar(usuario, demanda) {
  if (!usuario) return false;
  if (['ADMIN', 'GESTOR'].includes(usuario.perfil)) return true;
  return (
    usuario.perfil === 'FISCAL' && demanda?.fiscal?.id != null && demanda.fiscal.id === usuario.id
  );
}

/**
 * Ações de fluxo disponíveis para o status e o perfil (transição válida + perfil permitido).
 * `demanda` (opcional) identifica o fiscal designado nas ações de execução.
 * Conveniência de interface: a API é quem autoriza (403) e valida a transição (409).
 */
export function acoesDisponiveis(status, usuario, demanda) {
  const acoes = [];
  if (status === 'PENDENTE' && podeTriar(usuario)) acoes.push('INICIAR_TRIAGEM');
  if (status === 'EM_TRIAGEM' && podeTriar(usuario)) {
    acoes.push('CONCLUIR_TRIAGEM', 'SOLICITAR_COMPLEMENTACAO');
  }
  if (status === 'AGUARDANDO_DISTRIBUICAO' && podeDistribuir(usuario)) acoes.push('DISTRIBUIR');
  if (status === 'DISTRIBUIDA' && podeExecutar(usuario, demanda)) acoes.push('INICIAR_EXECUCAO');
  if (status === 'EM_ANDAMENTO' && podeExecutar(usuario, demanda)) {
    acoes.push('REGISTRAR_ATIVIDADE', 'REGISTRAR_FISCALIZACAO');
  }
  if (status === 'AGUARDANDO_CONCLUSAO' && podeConcluir(usuario))
    acoes.push('CONCLUIR', 'DEVOLVER');
  return acoes;
}

/** Perfis que enviam, vinculam e desvinculam documentos (CONSULTA só lê; a API responde 403). */
export const PERFIS_ESCRITA_DOCUMENTO = ['ADMIN', 'GESTOR', 'FISCAL', 'ANALISTA'];
export const podeEscreverDocumentos = (usuario) =>
  Boolean(usuario) && PERFIS_ESCRITA_DOCUMENTO.includes(usuario.perfil);

/** Administração de usuários, setores e equipes: somente ADMIN (a API responde 403 aos demais). */
export const PERFIS_ADMIN = ['ADMIN'];
