import httpClient from './httpClient.js';

/**
 * GET /api/demandas → `{ content, page, size, totalElements, totalPages }`.
 * Ignora filtros vazios. `sort` no formato `campo,asc|desc`.
 */
export async function listarDemandas(params = {}) {
  const limpos = Object.fromEntries(
    Object.entries(params).filter(([, valor]) => valor !== '' && valor != null),
  );
  const { data } = await httpClient.get('/demandas', { params: limpos });
  return data;
}

/** GET /api/demandas/{id} → DemandaDetalhe. */
export async function detalharDemanda(id) {
  const { data } = await httpClient.get(`/demandas/${id}`);
  return data;
}

/** POST /api/demandas → 201 DemandaDetalhe (com o número DEM-AAAA/NNNN). */
export async function cadastrarDemanda(corpo) {
  const { data } = await httpClient.post('/demandas', corpo);
  return data;
}

/** PUT /api/demandas/{id} → DemandaDetalhe (só em PENDENTE ou EM_TRIAGEM; senão 409). */
export async function editarDemanda(id, corpo) {
  const { data } = await httpClient.put(`/demandas/${id}`, corpo);
  return data;
}
