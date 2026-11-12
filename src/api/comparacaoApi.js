import httpClient from './httpClient.js';

/** POST /api/documentos/comparacao `{aId, bId}` → ComparacaoResponse (determinístico, não é IA). */
export async function compararDocumentos(aId, bId) {
  const { data } = await httpClient.post('/documentos/comparacao', { aId, bId });
  return data;
}
