import httpClient from './httpClient.js';

/**
 * GET /api/intelligence/mapa → `{ demonstrativo, aviso, pontos: [PontoMapa] }`.
 * Filtros: `de`, `ate` (datas), `municipioId`, `bioma`, `categoria`, `status`.
 * Filtros vazios não são enviados.
 */
export async function obterMapa(filtros = {}) {
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== '' && valor != null),
  );
  const { data } = await httpClient.get('/intelligence/mapa', { params });
  return data;
}
