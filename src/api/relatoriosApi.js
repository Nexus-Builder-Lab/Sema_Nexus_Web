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

/** GET /api/relatorios/demandas.csv (mesmos filtros, sem paginação) → Blob. Exige o token. */
export async function baixarCsvDemandas(filtros = {}) {
  const { data } = await httpClient.get('/relatorios/demandas.csv', {
    params: limparFiltros(filtros),
    responseType: 'blob',
  });
  return data;
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
