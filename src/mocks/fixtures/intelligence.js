import { http, HttpResponse } from 'msw';
import { temToken, problema } from '../contrato.js';
import { CATEGORIAS, MUNICIPIOS, STATUS } from './catalogos.js';
import { listarTodasDemandasMock } from './demandas.js';

// Indicadores fictícios dos mocks: um conjunto fixo de demandas simuladas e as mesmas agregações
// (com os mesmos filtros) que a API faz. Municípios/biomas são reais (IBGE); o resto é inventado.

export const BIOMAS = [
  { codigo: 'AMAZONIA', rotulo: 'Amazônia', ordem: 1 },
  { codigo: 'CERRADO', rotulo: 'Cerrado', ordem: 2 },
  { codigo: 'PANTANAL', rotulo: 'Pantanal', ordem: 3 },
];

const HOJE = '2026-11-10';
const AVISO = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';
const TOTAL_DOCUMENTOS = 47;

const doisDigitos = (n) => String(n).padStart(2, '0');

// Os indicadores são calculados a cada chamada sobre o mesmo estado em memória das demandas do
// Flux: cadastrar ou concluir uma demanda altera os números na consulta seguinte (como na API).
function filtrar(filtros = {}) {
  const { de, ate, municipioId, bioma, categoria, status } = filtros;
  return listarTodasDemandasMock().filter(
    (d) =>
      (!de || d.dataRecebimento >= de) &&
      (!ate || d.dataRecebimento <= ate) &&
      (!municipioId || String(d.municipio.id) === String(municipioId)) &&
      (!bioma || d.municipio.bioma === bioma) &&
      (!categoria || d.categoria === categoria) &&
      (!status || d.status === status),
  );
}

const finalizadaEm = (d) => (d.concluidaEm ? d.concluidaEm.slice(0, 10) : null);

const contar = (lista, predicado) => lista.filter(predicado).length;

export function resumoMock(filtros) {
  const lista = filtrar(filtros);
  return {
    demonstrativo: true,
    aviso: AVISO,
    totalDemandas: lista.length,
    pendentes: contar(lista, (d) => d.status === 'PENDENTE'),
    emAndamento: contar(lista, (d) => d.status === 'EM_ANDAMENTO'),
    finalizadas: contar(lista, (d) => d.status === 'FINALIZADA'),
    atrasadas: contar(
      lista,
      (d) => d.status !== 'FINALIZADA' && Boolean(d.prazo) && d.prazo < HOJE,
    ),
    totalDocumentos: TOTAL_DOCUMENTOS,
  };
}

function porCatalogo(lista, catalogo, valorDe, incluirZeros) {
  return catalogo
    .map((item) => ({
      codigo: item.codigo,
      rotulo: item.rotulo,
      total: contar(lista, (d) => valorDe(d) === item.codigo),
    }))
    .filter((item) => incluirZeros || item.total > 0);
}

const envelope = (itens) => ({ demonstrativo: true, aviso: AVISO, itens });

export function serieMensalMock(filtros) {
  const lista = filtrar(filtros);
  const meses = new Set();
  lista.forEach((d) => {
    meses.add(d.dataRecebimento.slice(0, 7));
    if (finalizadaEm(d)) meses.add(finalizadaEm(d).slice(0, 7));
  });
  return envelope(
    [...meses].sort().map((mes) => ({
      mes,
      cadastradas: contar(lista, (d) => d.dataRecebimento.startsWith(mes)),
      finalizadas: contar(lista, (d) => finalizadaEm(d)?.startsWith(mes)),
    })),
  );
}

export function porMunicipioMock(filtros) {
  const lista = filtrar(filtros);
  return envelope(
    MUNICIPIOS.map((m) => ({
      municipioId: m.id,
      municipio: m.nome,
      bioma: m.bioma,
      total: contar(lista, (d) => d.municipio.id === m.id),
    }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total || a.municipio.localeCompare(b.municipio)),
  );
}

export const porSituacaoMock = (filtros) =>
  envelope(porCatalogo(filtrar(filtros), STATUS, (d) => d.status, true));
export const porCategoriaMock = (filtros) =>
  envelope(porCatalogo(filtrar(filtros), CATEGORIAS, (d) => d.categoria, false));
export const porBiomaMock = (filtros) =>
  envelope(porCatalogo(filtrar(filtros), BIOMAS, (d) => d.municipio.bioma, true));

const ATIVIDADES = [
  ['CONCLUSAO', 'Demanda concluída após fiscalização em campo.'],
  ['FISCALIZACAO', 'Fiscalização registrada pela equipe.'],
  ['DISTRIBUICAO', 'Demanda distribuída à Equipe Alfa (demonstração).'],
  ['TRIAGEM', 'Triagem concluída; prioridade definida.'],
  ['CADASTRO', 'Demanda cadastrada.'],
];

export function dashboardMock() {
  return {
    demonstrativo: true,
    aviso: AVISO,
    resumo: resumoMock(),
    porSituacao: porSituacaoMock().itens,
    atividadesRecentes: ATIVIDADES.map(([tipo, texto], i) => ({
      data: `2026-11-${doisDigitos(10 - i)}T09:00:00`,
      tipo,
      texto,
      demanda: {
        id: 70 - i,
        numero: `DEM-2026/${String(70 - i).padStart(4, '0')}`,
        titulo: `Demanda fictícia ${70 - i}`,
      },
      usuario: { id: 3, nome: 'Fiscal Demonstrativo 1' },
    })),
  };
}

const FILTROS = ['de', 'ate', 'municipioId', 'bioma', 'categoria', 'status'];
function filtrosDaUrl(request) {
  const params = new URL(request.url).searchParams;
  return Object.fromEntries(FILTROS.filter((f) => params.get(f)).map((f) => [f, params.get(f)]));
}

function protegido(resposta) {
  return ({ request }) =>
    temToken(request)
      ? HttpResponse.json(resposta(request))
      : problema(
          401,
          'Não autenticado',
          'Token ausente ou inválido.',
          new URL(request.url).pathname,
        );
}

export const handlersIntelligence = [
  http.get(
    '/api/dashboard',
    protegido(() => dashboardMock()),
  ),
  http.get(
    '/api/intelligence/resumo',
    protegido((r) => resumoMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/serie-mensal',
    protegido((r) => serieMensalMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-situacao',
    protegido((r) => porSituacaoMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-municipio',
    protegido((r) => porMunicipioMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-categoria',
    protegido((r) => porCategoriaMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-bioma',
    protegido((r) => porBiomaMock(filtrosDaUrl(r))),
  ),
];

// ---------- Pontos do mapa (Issue #9) ----------

// `bioma` e `recebidaEm` só existem na fixture, para aplicar os filtros; não vão na resposta.
const FIXTURE = [
  [10, 'Desmatamento em área rural (fictício)', 5103403, 'Cuiabá', 'CERRADO', -15.601, -56.097],
  [11, 'Foco de queimada (fictício)', 5100250, 'Alta Floresta', 'AMAZONIA', -9.876, -56.086],
  [12, 'Assoreamento de córrego (fictício)', 5106505, 'Poconé', 'PANTANAL', -16.256, -56.627],
  [
    13,
    'Queimada às margens de rodovia (fictício)',
    5107602,
    'Rondonópolis',
    'CERRADO',
    -16.47,
    -54.636,
  ],
];
const RESTO = [
  ['EM_ANDAMENTO', 'DESMATAMENTO_ILEGAL', 'ALTA', false, false, '2026-03-10'],
  ['PENDENTE', 'QUEIMADA_INCENDIO', 'URGENTE', true, true, '2026-08-02'],
  ['DISTRIBUIDA', 'RECURSOS_HIDRICOS', 'MEDIA', false, false, '2026-05-20'],
  ['EM_TRIAGEM', 'QUEIMADA_INCENDIO', 'ALTA', true, false, '2026-09-14'],
];

const PONTOS = FIXTURE.map(([demandaId, titulo, municipioId, municipio, bioma, lat, lng], i) => {
  const [status, categoria, prioridade, aproximada, atrasada, recebidaEm] = RESTO[i];
  return {
    bioma,
    recebidaEm,
    demandaId,
    numero: `DEM-2026/${String(demandaId).padStart(4, '0')}`,
    titulo,
    municipioId,
    municipio,
    latitude: lat,
    longitude: lng,
    coordenadaAproximada: aproximada,
    status,
    categoria,
    prioridade,
    atrasada,
  };
});

/** Aplica os filtros do contrato (`de`, `ate`, `municipioId`, `bioma`, `categoria`, `status`). */
export function filtrarPontos(params) {
  const g = (nome) => params.get(nome);
  return PONTOS.filter(
    (p) =>
      (!g('municipioId') || String(p.municipioId) === g('municipioId')) &&
      (!g('bioma') || p.bioma === g('bioma')) &&
      (!g('categoria') || p.categoria === g('categoria')) &&
      (!g('status') || p.status === g('status')) &&
      (!g('de') || p.recebidaEm >= g('de')) &&
      (!g('ate') || p.recebidaEm <= g('ate')),
  ).map(({ bioma, recebidaEm, ...contrato }) => {
    void bioma;
    void recebidaEm;
    return contrato;
  });
}

// ---------- Camada de referência INPE (Issue #22) ----------
// Amostra pequena e FIXA no formato da API#34 (a API real carrega um snapshot de dados públicos do INPE).

const ATRIBUICAO = {
  fonte: 'INPE — dados públicos',
  oficialSema: false,
  atualizadoEm: '2026-11-09T12:00:00',
  aviso:
    'Dados públicos reais do INPE (Programa Queimadas / TerraBrasilis), camada de referência separada das demandas fictícias. Não são dados oficiais da SEMA-MT.',
};

const f = (id, dataHora, latitude, longitude, municipioId, municipio, bioma, satelite) => ({
  id,
  tipo: 'FOCO_CALOR',
  dataHora,
  latitude,
  longitude,
  municipioId,
  municipio,
  bioma,
  satelite,
  classe: null,
  areaKm2: null,
});
const d = (id, dataHora, latitude, longitude, municipioId, municipio, bioma, classe, areaKm2) => ({
  id,
  tipo: 'DESMATAMENTO',
  dataHora,
  latitude,
  longitude,
  municipioId,
  municipio,
  bioma,
  satelite: 'DETER',
  classe,
  areaKm2,
});

export const PONTOS_REFERENCIA = [
  f(1, '2026-10-30T17:40:00', -9.88, -56.09, 5100250, 'Alta Floresta', 'AMAZONIA', 'AQUA_M-T'),
  f(2, '2026-10-29T18:10:00', -9.9, -56.12, 5100250, 'Alta Floresta', 'AMAZONIA', 'NOAA-20'),
  f(3, '2026-10-28T17:05:00', -9.85, -56.0, 5100250, 'Alta Floresta', 'AMAZONIA', 'AQUA_M-T'),
  f(4, '2026-10-27T05:20:00', -16.25, -56.62, 5106505, 'Poconé', 'PANTANAL', 'NPP-375'),
  f(5, '2026-10-26T17:55:00', -16.3, -56.7, 5106505, 'Poconé', 'PANTANAL', 'AQUA_M-T'),
  f(6, '2026-10-25T17:30:00', -16.47, -54.63, 5107602, 'Rondonópolis', 'CERRADO', 'NOAA-20'),
  f(7, '2026-10-24T18:00:00', -15.6, -56.1, 5103403, 'Cuiabá', 'CERRADO', 'AQUA_M-T'),
  f(8, '2026-09-12T17:20:00', -9.95, -56.2, 5100250, 'Alta Floresta', 'AMAZONIA', 'NPP-375'),
  d(
    101,
    '2026-10-20T00:00:00',
    -9.8,
    -56.3,
    5100250,
    'Alta Floresta',
    'AMAZONIA',
    'DESMATAMENTO_CR',
    0.42,
  ),
  d(
    102,
    '2026-10-15T00:00:00',
    -16.2,
    -56.5,
    5106505,
    'Poconé',
    'PANTANAL',
    'CICATRIZ_DE_QUEIMADA',
    0.18,
  ),
];

const doTipo = (params) =>
  PONTOS_REFERENCIA.filter((p) => p.tipo === (params.get('tipo') || 'FOCO_CALOR'));

export function filtrarReferencia(params) {
  const g = (nome) => params.get(nome);
  return doTipo(params).filter(
    (p) =>
      (!g('municipioId') || String(p.municipioId) === g('municipioId')) &&
      (!g('bioma') || p.bioma === g('bioma')) &&
      (!g('de') || p.dataHora.slice(0, 10) >= g('de')) &&
      (!g('ate') || p.dataHora.slice(0, 10) <= g('ate')),
  );
}

export function metadadosReferenciaMock() {
  const importacao = (tipo, arquivo) => {
    const lista = PONTOS_REFERENCIA.filter((p) => p.tipo === tipo);
    return {
      id: tipo === 'FOCO_CALOR' ? 1 : 2,
      fonte: tipo === 'FOCO_CALOR' ? 'INPE — Programa Queimadas' : 'INPE — TerraBrasilis (DETER)',
      tipo,
      periodoDe: '2026-09-12',
      periodoAte: '2026-10-30',
      importadoEm: ATRIBUICAO.atualizadoEm,
      registros: lista.length,
      urlOrigem: 'https://dadosabertos.inpe.br/',
      licenca: 'Dados abertos do INPE',
      arquivo,
    };
  };
  return {
    ...ATRIBUICAO,
    importacoes: [importacao('FOCO_CALOR', 'focos.csv'), importacao('DESMATAMENTO', 'deter.csv')],
  };
}

export function referenciaPontosMock(params) {
  const pontos = filtrarReferencia(params);
  return { ...ATRIBUICAO, limite: 5000, truncado: false, pontos };
}

export function referenciaPorMunicipioMock(params) {
  const lista = filtrarReferencia(params);
  const mapa = new Map();
  for (const p of lista) {
    const atual = mapa.get(p.municipioId) ?? {
      municipioId: p.municipioId,
      municipio: p.municipio,
      bioma: p.bioma,
      total: 0,
    };
    atual.total += 1;
    mapa.set(p.municipioId, atual);
  }
  const itens = [...mapa.values()].sort((a, b) => b.total - a.total);
  return { ...ATRIBUICAO, total: lista.length, itens };
}

export const handlersReferencia = [
  http.get(
    '/api/intelligence/referencia/metadados',
    protegido(() => metadadosReferenciaMock()),
  ),
  http.get(
    '/api/intelligence/referencia/pontos',
    protegido((r) => referenciaPontosMock(new URL(r.url).searchParams)),
  ),
  http.get(
    '/api/intelligence/referencia/por-municipio',
    protegido((r) => referenciaPorMunicipioMock(new URL(r.url).searchParams)),
  ),
];
