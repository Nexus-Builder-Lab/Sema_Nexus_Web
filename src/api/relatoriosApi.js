import httpClient from './httpClient.js';
import { limparFiltros } from './intelligenceApi.js';

/**
 * GET /api/relatorios/demandas → `{ demonstrativo, aviso, content, page, size, totalElements, totalPages }`.
 * Filtros: `de`, `ate`, `municipioId`, `bioma`, `categoria`, `status`. Perfil FISCAL → 403.
 */
export async function obterRelatorioDemandas(filtros = {}, { page = 0, size = 20 } = {}) {
  const { data } = await httpClient.get('/relatorios/demandas', {
    params: { ...limparFiltros(filtros), page, size },
  });
  return data;
}

/** Lê o Blob como texto; `Blob.text()` não existe em todos os ambientes (ex.: jsdom), então usa FileReader. */
function lerTexto(blob) {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsText(blob);
  });
}

/** Com `responseType: 'blob'` o problem+json do erro chega como Blob: converte para objeto. */
async function lerErroBlob(erro) {
  const dados = erro?.response?.data;
  if (typeof Blob !== 'undefined' && dados instanceof Blob) {
    try {
      erro.response.data = JSON.parse(await lerTexto(dados));
    } catch {
      erro.response.data = undefined;
    }
  }
  return erro;
}

/** GET /api/relatorios/demandas.csv (mesmos filtros, sem paginação) → Blob. Exige o token. */
export async function baixarCsvDemandas(filtros = {}) {
  try {
    const { data } = await httpClient.get('/relatorios/demandas.csv', {
      params: limparFiltros(filtros),
      responseType: 'blob',
    });
    return data;
  } catch (erro) {
    throw await lerErroBlob(erro);
  }
}

export const NOME_ARQUIVO_CSV = 'relatorio-demandas-ficticio.csv';

/** Baixa o CSV autenticado e dispara o download no navegador. */
export async function baixarEGuardarCsv(filtros) {
  const blob = await baixarCsvDemandas(filtros);
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = NOME_ARQUIVO_CSV;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}
