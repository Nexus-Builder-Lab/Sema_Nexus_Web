import httpClient from './httpClient.js';

/**
 * GET /api/intelligence/sentinela/briefing (API#138; ADMIN/GESTOR; não grava nada) → BriefingSentinela
 * `{ aviso, geradoEm, validoAte, origem, modo, modelo, resumo, referenciaInpe, totais, anomalias, avisos… }`.
 * 503 + `Retry-After`: ainda não há briefing gerado. 403: perfil sem acesso.
 */
export async function obterBriefingSentinela() {
  const { data } = await httpClient.get('/intelligence/sentinela/briefing');
  return data;
}

/** Segundos do `Retry-After` de um 503 (null se ausente ou inválido). */
export function segundosRetryAfter(error) {
  const valor = Number(error?.response?.headers?.['retry-after']);
  return Number.isFinite(valor) && valor > 0 ? Math.ceil(valor) : null;
}
