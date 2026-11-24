import httpClient from './httpClient.js';

/** GET /api/documentos → página `{ content, page, size, totalElements, totalPages }`. Ignora filtros vazios. */
export async function listarDocumentos(params = {}) {
  const limpos = Object.fromEntries(
    Object.entries(params).filter(([, valor]) => valor !== '' && valor != null),
  );
  const { data } = await httpClient.get('/documentos', { params: limpos });
  return data;
}

/** GET /api/documentos/{id} → DocumentoDetalhe. */
export async function detalharDocumento(id) {
  const { data } = await httpClient.get(`/documentos/${id}`);
  return data;
}

/**
 * POST /api/documentos (multipart/form-data) → 201 DocumentoDetalhe.
 * `valores.palavrasChave` é uma lista; campos vazios não são enviados.
 * `onProgress` recebe o percentual (0–100) enviado.
 */
export async function enviarDocumento(valores, arquivo, onProgress) {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  for (const [campo, valor] of Object.entries(valores)) {
    if (campo === 'palavrasChave') {
      valor.forEach((palavra) => corpo.append('palavrasChave', palavra));
    } else if (valor !== '' && valor != null) {
      corpo.append(campo, String(valor));
    }
  }
  const { data } = await httpClient.post('/documentos', corpo, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evento) => {
      if (evento.total) onProgress?.(Math.round((evento.loaded * 100) / evento.total));
    },
  });
  return data;
}

/** GET /api/documentos/{id}/arquivo → Blob (precisa do token, por isso não é um link direto). */
export async function baixarArquivo(id) {
  const { data } = await httpClient.get(`/documentos/${id}/arquivo`, { responseType: 'blob' });
  return data;
}

/** GET /api/demandas/{id}/documentos → `[DocumentoResumo]`. */
export async function listarDocumentosDaDemanda(demandaId) {
  const { data } = await httpClient.get(`/demandas/${demandaId}/documentos`);
  return data;
}

/** POST /api/demandas/{id}/documentos `{ documentoId }` → 201 (409 se já vinculado). */
export async function vincularDocumento(demandaId, documentoId) {
  const { data } = await httpClient.post(`/demandas/${demandaId}/documentos`, { documentoId });
  return data;
}

/** DELETE /api/demandas/{id}/documentos/{documentoId} → 204 (remove só o vínculo). */
export async function desvincularDocumento(demandaId, documentoId) {
  await httpClient.delete(`/demandas/${demandaId}/documentos/${documentoId}`);
}

/** Baixa o arquivo autenticado e dispara o download no navegador. */
export async function baixarEGuardar(documento) {
  const blob = await baixarArquivo(documento.id);
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = documento.nomeArquivo || `documento-${documento.id}`;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}

/**
 * POST /api/documentos/pre-analise (multipart `arquivo`) → PreAnaliseDocumento
 * `{ titulo, municipioId, municipioNome, dataDocumento, palavrasChave, vinculosDemanda, textoExtraido, avisos }`.
 * Só sugere; nada é gravado (API#140). Perfis de upload (CONSULTA recebe 403).
 */
export async function preAnalisarDocumento(arquivo) {
  const corpo = new FormData();
  corpo.append('arquivo', arquivo);
  const { data } = await httpClient.post('/documentos/pre-analise', corpo, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
