import httpClient from './httpClient.js';

async function obter(caminho, params) {
  const { data } = await httpClient.get(caminho, { params });
  return data;
}

/** Remove filtros vazios para não enviar `?bioma=&de=` à API. */
export function limparFiltros(filtros = {}) {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== '' && valor != null),
  );
}

/** GET /api/dashboard → `{ resumo, porSituacao, atividadesRecentes, demonstrativo, aviso }`. */
export const obterDashboard = () => obter('/dashboard');

// Indicadores agregados. Filtros: `de`, `ate` (AAAA-MM-DD), `municipioId`, `bioma`, `categoria`, `status`.
/** → `{ totalDemandas, pendentes, emAndamento, finalizadas, atrasadas, totalDocumentos }`. */
export const obterResumo = (filtros) => obter('/intelligence/resumo', limparFiltros(filtros));
/** → `{ itens: [{ mes: 'AAAA-MM', cadastradas, finalizadas }] }`. */
export const obterSerieMensal = (filtros) =>
  obter('/intelligence/serie-mensal', limparFiltros(filtros));
/** → `{ itens: [{ codigo, rotulo, total }] }` (os 7 status, na ordem do fluxo). */
export const obterPorSituacao = (filtros) =>
  obter('/intelligence/por-situacao', limparFiltros(filtros));
/** → `{ itens: [{ municipioId, municipio, bioma, total }] }` (do maior para o menor). */
export const obterPorMunicipio = (filtros) =>
  obter('/intelligence/por-municipio', limparFiltros(filtros));
export const obterPorCategoria = (filtros) =>
  obter('/intelligence/por-categoria', limparFiltros(filtros));
export const obterPorBioma = (filtros) => obter('/intelligence/por-bioma', limparFiltros(filtros));

/**
 * GET /api/intelligence/mapa → `{ demonstrativo, aviso, pontos: [PontoMapa] }`.
 * Filtros: `de`, `ate` (datas), `municipioId`, `bioma`, `categoria`, `status`.
 * Filtros vazios não são enviados.
 */
export const obterMapa = (filtros = {}) => obter('/intelligence/mapa', limparFiltros(filtros));
