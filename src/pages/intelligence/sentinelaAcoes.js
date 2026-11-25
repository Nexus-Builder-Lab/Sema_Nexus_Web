// Atalhos de navegação das ações sugeridas pela Sentinela (GH-142). Só montam o destino: nada é gravado
// aqui; no cadastro, a pessoa revisa e salva. Parâmetros vazios/nulos não vão para a URL (nunca há JWT).

function consulta(parametros, permitidos) {
  const q = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros ?? {})) {
    if (permitidos && !permitidos.includes(chave)) continue;
    if (valor === null || valor === undefined || valor === '') continue;
    q.set(chave, String(valor));
  }
  const texto = q.toString();
  return texto ? `?${texto}` : '';
}

const CAMPOS_MAPA = ['municipioId', 'camada', 'de', 'ate', 'status', 'categoria', 'bioma'];
const CAMPOS_DEMANDAS = [
  'municipioId',
  'status',
  'equipeId',
  'fiscalId',
  'categoria',
  'prioridade',
  'atrasada',
  'de',
  'ate',
];
const CAMPOS_CADASTRO = [
  'origem',
  'municipioId',
  'municipio',
  'categoria',
  'latitude',
  'longitude',
  'titulo',
  'localidade',
];

/** Destino (rota + query) de uma ação, ou null se o tipo for desconhecido. */
export function destinoDaAcao(acao) {
  const p = acao?.parametros;
  switch (acao?.tipo) {
    case 'FILTRAR_MAPA':
      return `/intelligence/inteligencia-ambiental${consulta(p, CAMPOS_MAPA)}`;
    case 'FILTRAR_DEMANDAS':
      return `/flux/demandas${consulta(p, CAMPOS_DEMANDAS)}`;
    case 'CRIAR_DEMANDA_MONITORAMENTO':
      return `/flux/demandas/nova${consulta({ ...p, origem: 'MONITORAMENTO' }, CAMPOS_CADASTRO)}`;
    default:
      return null;
  }
}

export const TIPOS_ANOMALIA = [
  { tipo: 'INPE_SEM_DEMANDA', rotulo: 'Dados públicos do INPE sem demanda aberta' },
  { tipo: 'FILA_ACUMULADA', rotulo: 'Fila acumulada' },
  { tipo: 'EQUIPE_SOBRECARREGADA', rotulo: 'Equipe sobrecarregada' },
];

const ORDEM_SEVERIDADE = { ALTA: 0, MEDIA: 1, BAIXA: 2 };

/** Agrupa por tipo (ordem fixa; tipos novos ao final), severidade ALTA primeiro. Ignora grupos vazios. */
export function agruparAnomalias(anomalias = []) {
  const conhecidos = TIPOS_ANOMALIA.map((t) => t.tipo);
  const extras = [...new Set(anomalias.map((a) => a.tipo))].filter((t) => !conhecidos.includes(t));
  const tipos = [...TIPOS_ANOMALIA, ...extras.map((tipo) => ({ tipo, rotulo: tipo }))];
  return tipos
    .map(({ tipo, rotulo }) => ({
      tipo,
      rotulo,
      itens: anomalias
        .filter((a) => a.tipo === tipo)
        .sort(
          (a, b) => (ORDEM_SEVERIDADE[a.severidade] ?? 9) - (ORDEM_SEVERIDADE[b.severidade] ?? 9),
        ),
    }))
    .filter((g) => g.itens.length > 0);
}
