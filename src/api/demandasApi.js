import { postSseComAlternativa } from './sseClient.js';
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

/** GET /api/demandas/{id}/historico → `[HistoricoItem]`, do mais recente ao mais antigo. */
export async function listarHistorico(id) {
  const { data } = await httpClient.get(`/demandas/${id}/historico`);
  return data;
}

/** POST /api/demandas/{id}/triagem/iniciar (PENDENTE → EM_TRIAGEM). */
export async function iniciarTriagem(id) {
  const { data } = await httpClient.post(`/demandas/${id}/triagem/iniciar`);
  return data;
}

/**
 * POST /api/demandas/{id}/triagem. `decisao`: CLASSIFICAR (categoria e prioridade obrigatórias)
 * ou SOLICITAR_COMPLEMENTACAO; `justificativa` sempre obrigatória.
 */
export async function decidirTriagem(id, corpo) {
  const { data } = await httpClient.post(`/demandas/${id}/triagem`, corpo);
  return data;
}

/** POST /api/demandas/{id}/distribuicao `{ equipeId, fiscalId, prazo, observacoes }`. */
export async function distribuirDemanda(id, corpo) {
  const { data } = await httpClient.post(`/demandas/${id}/distribuicao`, corpo);
  return data;
}

/** POST /api/demandas/{id}/inicio (DISTRIBUIDA → EM_ANDAMENTO; 403 se fiscal não designado). */
export async function iniciarExecucao(id) {
  const { data } = await httpClient.post(`/demandas/${id}/inicio`);
  return data;
}

/** POST /api/demandas/{id}/atividades `{ descricao, data? }` → 201 HistoricoItem (só EM_ANDAMENTO). */
export async function registrarAtividade(id, corpo) {
  const { data } = await httpClient.post(`/demandas/${id}/atividades`, corpo);
  return data;
}

/** POST /api/demandas/{id}/fiscalizacao (EM_ANDAMENTO → AGUARDANDO_CONCLUSAO). */
export async function registrarFiscalizacao(id, corpo) {
  const { data } = await httpClient.post(`/demandas/${id}/fiscalizacao`, corpo);
  return data;
}

/** GET /api/demandas/checklists → `[ChecklistModelo]` por categoria (Issue API#145). */
export async function listarChecklists() {
  const { data } = await httpClient.get('/demandas/checklists');
  return data;
}

/** GET /api/demandas/{id}/fotos → `[FotoFiscalizacao]` com metadados e selo EXIF. */
export async function listarFotosFiscalizacao(demandaId) {
  const { data } = await httpClient.get(`/demandas/${demandaId}/fotos`);
  return data;
}

/**
 * POST /api/demandas/{id}/fotos (multipart, parte `arquivo`) → 201 FotoFiscalizacao.
 * Apenas EM_ANDAMENTO; JPG, PNG ou WebP até 10 MB; máximo de 20 fotos por demanda.
 */
export async function enviarFotoFiscalizacao(demandaId, arquivo, onProgress) {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  const { data } = await httpClient.post(`/demandas/${demandaId}/fotos`, corpo, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evento) => {
      if (evento.total) onProgress?.(Math.round((evento.loaded * 100) / evento.total));
    },
  });
  return data;
}

/** GET /api/demandas/{id}/fotos/{fotoId}/arquivo → Blob autenticado (sem JWT na URL).
 * Usa `arraybuffer` (como `relatoriosApi.js`) para compatibilidade com MSW/XHR no Node 22. */
export async function baixarFotoFiscalizacao(demandaId, fotoId, { signal } = {}) {
  try {
    const { data, headers } = await httpClient.get(
      `/demandas/${demandaId}/fotos/${fotoId}/arquivo`,
      {
        responseType: 'arraybuffer',
        signal,
      },
    );
    return new Blob([data], { type: headers?.['content-type'] || 'application/octet-stream' });
  } catch (erro) {
    const dados = erro?.response?.data;
    if (dados instanceof ArrayBuffer) {
      try {
        erro.response.data = JSON.parse(new TextDecoder('utf-8').decode(dados));
      } catch {
        erro.response.data = undefined;
      }
    }
    throw erro;
  }
}

/** Baixa a foto autenticada e dispara o download no navegador. */
export async function baixarEGuardarFoto(demandaId, foto) {
  const blob = await baixarFotoFiscalizacao(demandaId, foto.id);
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = foto.nomeOriginal || `foto-${foto.id}`;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}

/** DELETE /api/demandas/{id}/fotos/{fotoId} → 204 (somente quem enviou, antes da conclusão). */
export async function excluirFotoFiscalizacao(demandaId, fotoId) {
  await httpClient.delete(`/demandas/${demandaId}/fotos/${fotoId}`);
}

/** POST /api/demandas/{id}/conclusao `{ resultadoFinal, justificativa }` (→ FINALIZADA). */
export async function concluirDemanda(id, corpo) {
  const { data } = await httpClient.post(`/demandas/${id}/conclusao`, corpo);
  return data;
}

/** POST /api/demandas/{id}/devolucao `{ justificativa }` (AGUARDANDO_CONCLUSAO → EM_ANDAMENTO). */
export async function devolverDemanda(id, corpo) {
  const { data } = await httpClient.post(`/demandas/${id}/devolucao`, corpo);
  return data;
}

/**
 * POST /api/demandas/{id}/triagem/sugestao — Agente de Triagem (Issue API#107). Não grava nada:
 * devolve decisão, categoria, prioridade, núcleo, justificativa, duplicatas, evidências e avisos.
 * O agente pode levar alguns segundos (IA local); na primeira chamada, até ~1 minuto.
 */
export async function sugerirTriagem(id, { signal } = {}) {
  const { data } = await httpClient.post(`/demandas/${id}/triagem/sugestao`, null, {
    timeout: 120_000,
    signal,
  });
  return data;
}

/**
 * Mesma sugestão por SSE (API#135, `/triagem/sugestao/stream`): `onEvento(nome, dados)` recebe o progresso
 * e a função resolve com o `concluido`. Sem suporte ao stream, usa o endpoint JSON de forma transparente.
 */
export function sugerirTriagemStream(id, { signal, onEvento } = {}) {
  return postSseComAlternativa(`/demandas/${id}/triagem/sugestao/stream`, null, {
    signal,
    onEvento,
    alternativa: () => sugerirTriagem(id, { signal }),
  });
}

/**
 * Agente de Distribuição (Issue API#130): sugere equipe, fiscal e prazo sem gravar nada
 * (ADMIN/GESTOR; 409 fora de Aguardando distribuição). Na primeira chamada pode levar ~1 minuto.
 */
export async function sugerirDistribuicao(id) {
  const { data } = await httpClient.post(`/demandas/${id}/distribuicao/sugestao`, null, {
    timeout: 120_000,
  });
  return data;
}

/**
 * Agente Copiloto de Minuta (Issue API#137): `POST /api/demandas/{id}/minuta-vistoria` devolve o
 * rascunho em Markdown (`markdown`, `aviso`, `modo`, `modelo`, `nomeArquivoSugerido`, `evidencias`,
 * `avisos`). Não grava nada (ADMIN/GESTOR/ANALISTA/FISCAL designado). Primeira chamada: até ~1 minuto.
 */
export async function gerarMinutaVistoria(id, { signal } = {}) {
  const { data } = await httpClient.post(`/demandas/${id}/minuta-vistoria`, null, {
    timeout: 120_000,
    signal,
  });
  return data;
}
