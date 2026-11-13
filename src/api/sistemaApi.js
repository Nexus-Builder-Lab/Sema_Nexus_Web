import httpClient from './httpClient.js';

/**
 * GET /api/sistema/painel (Issue API#114, somente ADMIN) → `{ geradoEm, sistema, verificacoes[], agentes[] }`.
 * Verificações: api, banco, ia, inpe, armazenamento (estado OK | ATENCAO | INDISPONIVEL). Nunca contém chaves.
 */
export async function obterPainel() {
  const inicio = performance.now();
  const { data } = await httpClient.get('/sistema/painel', { timeout: 30_000 });
  return { ...data, latenciaWebMs: Math.round(performance.now() - inicio) };
}
