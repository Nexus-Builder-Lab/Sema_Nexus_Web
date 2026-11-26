import { postSseComAlternativa } from './sseClient.js';
import httpClient from './httpClient.js';

/**
 * POST /api/docia/perguntas `{pergunta, demandaId?, historico?}` → `{ resposta, modo, referencias: [{ documentoId,
 * titulo, trecho, aderenciaTextual }], agente, modelo, passos }`. `demandaId` restringe a busca aos documentos da
 * demanda (403/404 conforme o escopo); `historico` são os últimos turnos `[{pergunta, resposta}]` (a API mantém
 * 4 e trunca). Com o agente de IA a resposta pode levar alguns segundos; a primeira, até ~1 minuto.
 */
export async function perguntar(pergunta, { demandaId, historico, signal } = {}) {
  const corpo = { pergunta };
  if (demandaId != null) corpo.demandaId = demandaId;
  if (historico?.length) corpo.historico = historico;
  const { data } = await httpClient.post('/docia/perguntas', corpo, { timeout: 120_000, signal });
  return data;
}

/** Mesma pergunta por SSE (`/docia/perguntas/stream`) com progresso em `onEvento` e alternativa JSON. */
export function perguntarStream(pergunta, { demandaId, historico, signal, onEvento } = {}) {
  const corpo = { pergunta };
  if (demandaId != null) corpo.demandaId = demandaId;
  if (historico?.length) corpo.historico = historico;
  return postSseComAlternativa('/docia/perguntas/stream', corpo, {
    signal,
    onEvento,
    alternativa: () => perguntar(pergunta, { demandaId, historico, signal }),
  });
}

/**
 * POST /api/docia/respostas/{execucaoId}/avaliacao `{ avaliacao: 'UTIL' | 'IMPRECISA' }` → 204.
 * Feedback opcional do autor da pergunta sobre uma resposta do Assistente DocIA (Issue API#131).
 */
export async function avaliarResposta(execucaoId, avaliacao) {
  await httpClient.post(`/docia/respostas/${encodeURIComponent(execucaoId)}/avaliacao`, {
    avaliacao,
  });
}
