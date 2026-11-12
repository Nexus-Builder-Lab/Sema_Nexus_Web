import httpClient from './httpClient.js';

/** POST /api/docia/perguntas `{pergunta}` → `{ resposta, modo, referencias: [{ documentoId, titulo, trecho }] }`. */
export async function perguntar(pergunta) {
  const { data } = await httpClient.post('/docia/perguntas', { pergunta });
  return data;
}
