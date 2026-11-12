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

/** Com `responseType: 'arraybuffer'` o problem+json do erro chega como ArrayBuffer: converte para objeto. */
function lerErroBinario(erro) {
  const dados = erro?.response?.data;
  if (dados instanceof ArrayBuffer) {
    try {
      erro.response.data = JSON.parse(new TextDecoder('utf-8').decode(dados));
    } catch {
      erro.response.data = undefined;
    }
  }
  return erro;
}

/**
 * GET /api/relatorios/demandas.csv (mesmos filtros, sem paginação) → Blob. Exige o token.
 * Usa `arraybuffer` (e não `blob`) para não depender do Blob do XHR, que quebra sob o MSW no Node 22.
 */
export async function baixarCsvDemandas(filtros = {}) {
  try {
    const { data } = await httpClient.get('/relatorios/demandas.csv', {
      params: limparFiltros(filtros),
      responseType: 'arraybuffer',
    });
    return new Blob([data], { type: 'text/csv;charset=utf-8' });
  } catch (erro) {
    throw lerErroBinario(erro);
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
