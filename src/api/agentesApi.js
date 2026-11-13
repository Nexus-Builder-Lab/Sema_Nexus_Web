import httpClient from './httpClient.js';

/**
 * GET /api/agentes/status (Issue API#106) → `{ modo: LOCAL|CLAUDE|DEMONSTRATIVO, descricao,
 * agentes: [{ id, nome, modulo, modelo, descricao }] }`. Nunca contém chaves.
 */
export async function statusAgentes() {
  const { data } = await httpClient.get('/agentes/status');
  return data;
}
