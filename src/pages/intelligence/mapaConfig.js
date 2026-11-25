// Configuração visual do mapa: cor por categoria (códigos do contrato da API).
export const CORES_CATEGORIA = {
  DESMATAMENTO_ILEGAL: '#b42318',
  QUEIMADA_INCENDIO: '#e8590c',
  RECURSOS_HIDRICOS: '#1971c2',
  FAUNA_SILVESTRE: '#7b4a12',
  PESCA_IRREGULAR: '#0c8599',
  MINERACAO_IRREGULAR: '#6f42c1',
  RESIDUOS_POLUICAO: '#495057',
  AREA_PRESERVACAO_PERMANENTE: '#2b8a3e',
};
export const COR_SEM_CATEGORIA = '#868e96';

export const ROTULOS_CATEGORIA = {
  DESMATAMENTO_ILEGAL: 'Desmatamento ilegal',
  QUEIMADA_INCENDIO: 'Queimada / incêndio',
  RECURSOS_HIDRICOS: 'Recursos hídricos',
  FAUNA_SILVESTRE: 'Fauna silvestre',
  PESCA_IRREGULAR: 'Pesca irregular',
  MINERACAO_IRREGULAR: 'Mineração irregular',
  RESIDUOS_POLUICAO: 'Resíduos e poluição',
  AREA_PRESERVACAO_PERMANENTE: 'Área de preservação permanente',
};

export const ROTULOS_STATUS = {
  PENDENTE: 'Pendente',
  EM_TRIAGEM: 'Em triagem',
  AGUARDANDO_DISTRIBUICAO: 'Aguardando distribuição',
  DISTRIBUIDA: 'Distribuída',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CONCLUSAO: 'Aguardando conclusão',
  FINALIZADA: 'Finalizada',
};

export const corDaCategoria = (codigo) => CORES_CATEGORIA[codigo] ?? COR_SEM_CATEGORIA;
export const rotuloDaCategoria = (codigo) =>
  codigo ? (ROTULOS_CATEGORIA[codigo] ?? codigo) : 'Sem categoria';

export const FONTE_MALHA = 'Malha territorial: IBGE (API de Malhas v3, municípios de MT).';
export const CENTRO_MT = [-12.9, -55.9];
export const ZOOM_MT = 6;

export const FILTROS_VAZIOS = {
  municipioId: '',
  bioma: '',
  categoria: '',
  status: '',
  de: '',
  ate: '',
  satDe: '',
  satAte: '',
};

// Camada INPE (Web#22): cores e limites. Estilo distinto das demandas (círculos pequenos, sem contorno branco).
export const COR_FOCO = '#d9480f';
export const COR_DETER = '#7048e8';
export const LIMITE_PONTOS_SATELITE = 3000;
export const NOME_CAMADA_FOCOS = 'Focos de calor — INPE (dados públicos)';
export const NOME_CAMADA_DETER = 'Alertas de desmatamento — DETER (dados públicos)';

const ROTULOS_BIOMA = { AMAZONIA: 'Amazônia', CERRADO: 'Cerrado', PANTANAL: 'Pantanal' };
export const rotuloDoBioma = (codigo) => (codigo ? (ROTULOS_BIOMA[codigo] ?? codigo) : 'Sem bioma');

// Panes do mapa (z-index): tiles 200 · fundo da UF 350 · malha 360 · concentração 370 · áreas do INPE 380 ·
// overlayPane 400 (marcadores de demanda, focos INPE, contorno). Camadas recriadas nunca cobrem os marcadores (Web#109).
export const PANE_INPE_AREAS = 'nx-inpe-areas';

// Seleção no mapa (área afetada): pane próprio abaixo do overlayPane, para o polígono/destaque nunca cobrir os
// marcadores (regra dos panes, Web#109). Cores distintas de demandas, focos e DETER.
export const PANE_SELECAO = 'nx-selecao';
export const COR_SELECAO_INPE = '#c2255c';
export const COR_SELECAO_DEMANDA = '#1864ab';

/** Caixa aproximada de Mato Grosso: foco vindo de URL/Action Card fora dela (ou não numérico) é ignorado. */
export const LIMITES_MT = { latMin: -18.5, latMax: -7, lonMin: -62, lonMax: -50 };
export const ZOOM_FOCO_MIN = 5;
export const ZOOM_FOCO_MAX = 18;

/** `{ lat, lon, zoom? }` válido dentro de MT (zoom limitado a 5..18) ou `null`. */
export function focoValido(latBruto, lonBruto, zoomBruto) {
  const vazio = (v) => v == null || v === '';
  if (vazio(latBruto) || vazio(lonBruto)) return null;
  const lat = Number(latBruto);
  const lon = Number(lonBruto);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < LIMITES_MT.latMin || lat > LIMITES_MT.latMax) return null;
  if (lon < LIMITES_MT.lonMin || lon > LIMITES_MT.lonMax) return null;
  const z = vazio(zoomBruto) ? NaN : Number(zoomBruto);
  const zoom = Number.isFinite(z) ? Math.min(ZOOM_FOCO_MAX, Math.max(ZOOM_FOCO_MIN, z)) : undefined;
  return { lat, lon, zoom };
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (t) =>
  DATA_ISO.test(t) &&
  !Number.isNaN(Date.parse(`${t}T00:00:00Z`)) &&
  new Date(`${t}T00:00:00Z`).toISOString().startsWith(t);
const CODIGO = /^[A-Z][A-Z0-9_]*$/;

/**
 * Parser único dos parâmetros de URL do mapa (atalhos da Sentinela GH-142 e foco GH-139): devolve
 * `{ filtros, ligadas, foco }` descartando o que for inválido. `municipioId` inteiro positivo;
 * `de`/`ate` AAAA-MM-DD com de <= ate (satDe/satAte); `categoria`/`status`/`bioma` em maiúsculas e, quando
 * `catalogos` traz a lista correspondente, existentes nela; `camada=INPE` liga focos e DETER; `lat`/`lon`/`zoom`
 * viram `foco` via `focoValido`. Sem catálogo carregado só a forma é validada; reaplique após carregar.
 */
export function lerParametrosMapa(params, catalogos = {}) {
  const ler = (c) => (params.get(c) ?? '').trim();
  const filtros = { ...FILTROS_VAZIOS };
  const municipioId = ler('municipioId');
  if (/^[1-9]\d*$/.test(municipioId)) filtros.municipioId = municipioId;
  const codigo = (campo, lista) => {
    const v = ler(campo);
    if (!CODIGO.test(v)) return '';
    return lista && lista.length > 0 && !lista.some((i) => i.codigo === v) ? '' : v;
  };
  filtros.bioma = codigo('bioma', catalogos.biomas);
  filtros.categoria = codigo('categoria', catalogos.categorias);
  filtros.status = codigo('status', catalogos.situacoes);
  const de = ler('de');
  const ate = ler('ate');
  if (dataValida(de) && dataValida(ate) && de <= ate) {
    filtros.satDe = de;
    filtros.satAte = ate;
  }
  const inpe = ler('camada') === 'INPE';
  return {
    filtros,
    ligadas: { FOCO_CALOR: inpe, DESMATAMENTO: inpe },
    foco: focoValido(params.get('lat'), params.get('lon'), params.get('zoom')),
  };
}
