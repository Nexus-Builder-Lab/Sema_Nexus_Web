import httpClient from './httpClient.js';

/**
 * POST /api/docia/perguntas `{pergunta}` → `{ resposta, modo, referencias: [{ documentoId, titulo, trecho }],
 * agente, modelo, passos }` (agente/modelo/passos desde a Issue API#108). Com o Agente DocIA (IA local) a
 * resposta pode levar alguns segundos; a primeira, até ~1 minuto.
 */
export async function perguntar(pergunta) {
  const { data } = await httpClient.post('/docia/perguntas', { pergunta }, { timeout: 120_000 });
  return data;
}
