// Fixtures fictícias para o mapa e os catálogos (dados demonstrativos; municípios são referências IBGE).
export const MUNICIPIOS = [
  {
    id: 5103403,
    nome: 'Cuiabá',
    regiao: 'Baixada Cuiabana',
    bioma: 'CERRADO',
    latitude: -15.601,
    longitude: -56.097,
  },
  {
    id: 5107602,
    nome: 'Rondonópolis',
    regiao: 'Sul',
    bioma: 'CERRADO',
    latitude: -16.47,
    longitude: -54.636,
  },
  {
    id: 5106505,
    nome: 'Poconé',
    regiao: 'Baixada Cuiabana',
    bioma: 'PANTANAL',
    latitude: -16.256,
    longitude: -56.627,
  },
  {
    id: 5100250,
    nome: 'Alta Floresta',
    regiao: 'Norte',
    bioma: 'AMAZONIA',
    latitude: -9.876,
    longitude: -56.086,
  },
];

export const BIOMAS = [
  { codigo: 'AMAZONIA', rotulo: 'Amazônia', ordem: 1 },
  { codigo: 'CERRADO', rotulo: 'Cerrado', ordem: 2 },
  { codigo: 'PANTANAL', rotulo: 'Pantanal', ordem: 3 },
];

export const CATEGORIAS = [
  { codigo: 'DESMATAMENTO_ILEGAL', rotulo: 'Desmatamento ilegal', ordem: 1 },
  { codigo: 'QUEIMADA_INCENDIO', rotulo: 'Queimada / incêndio', ordem: 2 },
  { codigo: 'RECURSOS_HIDRICOS', rotulo: 'Recursos hídricos', ordem: 3 },
];

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
