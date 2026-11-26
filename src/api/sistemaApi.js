import httpClient from './httpClient.js';

/**
 * GET /api/sistema/painel (Issue API#114, somente ADMIN) → `{ geradoEm, sistema, verificacoes[], agentes[], governanca }`.
 * Verificações: api, banco, ia, inpe, armazenamento (estado OK | ATENCAO | INDISPONIVEL). Nunca contém chaves.
 */
export async function obterPainel() {
  const inicio = performance.now();
  const { data } = await httpClient.get('/sistema/painel', { timeout: 30_000 });
  return { ...data, latenciaWebMs: Math.round(performance.now() - inicio) };
}

/**
 * POST /api/sistema/agentes/avaliar (Issue API#131, somente ADMIN) → RelatorioAvaliacao
 * `{ executadaEm, modo, total, aprovados, reprovados, duracaoMs, casos[] }`.
 * Bateria determinística de regressão e casos adversariais sobre as regras locais (sem modelo
 * de IA e sem ler ou gravar dados operacionais).
 */
export async function avaliarAgentes() {
  const { data } = await httpClient.post('/sistema/agentes/avaliar', null, { timeout: 30_000 });
  return data;
}
