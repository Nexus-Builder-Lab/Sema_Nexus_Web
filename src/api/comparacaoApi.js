import httpClient from './httpClient.js';

/** POST /api/documentos/comparacao `{aId, bId}` → ComparacaoResponse (determinístico, não é IA). */
export async function compararDocumentos(aId, bId) {
  const { data } = await httpClient.post('/documentos/comparacao', { aId, bId });
  return data;
}

/**
 * POST /api/docia/comparacao/explicar `{aId, bId}` → ExplicacaoComparacaoResponse
 * (tabela de grandezas determinística + resumo do agente; 400 mesmo documento/sem texto, 404 inexistente).
 */
export async function explicarComparacao(aId, bId) {
  const { data } = await httpClient.post('/docia/comparacao/explicar', { aId, bId });
  return data;
}
