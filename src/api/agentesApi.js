import httpClient from './httpClient.js';

/**
 * GET /api/agentes/status (Issue API#106) → `{ modo: LOCAL|CLAUDE|DEMONSTRATIVO, descricao,
 * agentes: [{ id, nome, modulo, modelo, descricao }] }`. Nunca contém chaves.
 */
export async function statusAgentes() {
  const { data } = await httpClient.get('/agentes/status');
  return data;
}

/**
 * POST /api/agentes/assistente-global `{pergunta}` (API#139, qualquer perfil autenticado, somente leitura) ->
 * `{ aviso, modo: LOCAL|CLAUDE|DEMONSTRATIVO, modelo, resposta, links: [{tipo, rotulo, url}], ferramentas,
 * evidencias, avisos }`. A 1a chamada com IA local pode levar 30-50 s; 429 = limite da categoria IA.
 */
export async function assistenteGlobal(pergunta, { signal } = {}) {
  const { data } = await httpClient.post(
    '/agentes/assistente-global',
    { pergunta },
    { timeout: 120_000, signal },
  );
  return data;
}
