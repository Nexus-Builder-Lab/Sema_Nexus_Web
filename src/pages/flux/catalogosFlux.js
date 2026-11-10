import {
  listarCategorias,
  listarMunicipios,
  listarOrigens,
  listarPrioridades,
  listarStatus,
} from '../../api/catalogosApi.js';

/** Carrega os catálogos usados nas telas de demanda (função estável para `useCarregar`). */
export async function carregarCatalogosFlux() {
  const [status, prioridades, categorias, origens, municipios] = await Promise.all([
    listarStatus(),
    listarPrioridades(),
    listarCategorias(),
    listarOrigens(),
    listarMunicipios(),
  ]);
  return { status, prioridades, categorias, origens, municipios };
}

/** `codigo` → `rotulo` de um catálogo da API (cai no próprio código se não encontrar). */
export function rotuloDoCatalogo(itens, codigo) {
  if (!codigo) return '—';
  return itens?.find((item) => item.codigo === codigo)?.rotulo ?? codigo;
}
