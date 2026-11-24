import httpClient from './httpClient.js';

/**
 * POST /api/docia/perguntas `{pergunta, demandaId?, historico?}` → `{ resposta, modo, referencias: [{ documentoId,
 * titulo, trecho, aderenciaTextual }], agente, modelo, passos }`. `demandaId` restringe a busca aos documentos da
 * demanda (403/404 conforme o escopo); `historico` são os últimos turnos `[{pergunta, resposta}]` (a API mantém
 * 4 e trunca). Com o agente de IA a resposta pode levar alguns segundos; a primeira, até ~1 minuto.
 */
export async function perguntar(pergunta, { demandaId, historico } = {}) {
  const corpo = { pergunta };
  if (demandaId != null) corpo.demandaId = demandaId;
  if (historico?.length) corpo.historico = historico;
  const { data } = await httpClient.post('/docia/perguntas', corpo, { timeout: 120_000 });
  return data;
}
