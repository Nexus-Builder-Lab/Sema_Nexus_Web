// Estados das verificações do Painel do sistema (Web#123).

export const ESTADOS = {
  OK: { rotulo: 'Operando', classe: 'ok' },
  ATENCAO: { rotulo: 'Atenção', classe: 'atencao' },
  INDISPONIVEL: { rotulo: 'Indisponível', classe: 'erro' },
  NAO_CONFIGURADO: { rotulo: 'Não configurado', classe: 'neutro' },
  DESLIGADO: { rotulo: 'Desligado', classe: 'neutro' },
  VERIFICANDO: { rotulo: 'Verificando…', classe: 'neutro' },
};

export const estadoInfo = (estado) => ESTADOS[estado] ?? ESTADOS.VERIFICANDO;

/** Junta as verificações da API e do navegador em um mapa id → verificação. */
export function mapaVerificacoes(painel, navegador) {
  const mapa = {};
  for (const v of painel?.verificacoes ?? []) mapa[v.id] = v;
  if (painel) {
    mapa.web = {
      id: 'web',
      nome: 'Servidor web (Nginx)',
      estado: 'OK',
      latenciaMs: painel.latenciaWebMs,
      resumo: 'Entregando a interface e repassando as chamadas para a API.',
      detalhes: {},
    };
  }
  mapa.esri = { id: 'esri', nome: 'Esri (satélite)', estado: 'VERIFICANDO', ...navegador?.esri };
  mapa.osm = { id: 'osm', nome: 'OpenStreetMap', estado: 'VERIFICANDO', ...navegador?.osm };
  const provedor = mapa.ia?.detalhes?.provedorConfigurado;
  mapa.claude = {
    id: 'claude',
    nome: 'Claude (Anthropic)',
    estado: provedor === 'ANTHROPIC' ? mapa.ia.estado : 'DESLIGADO',
    resumo:
      provedor === 'ANTHROPIC'
        ? mapa.ia.resumo
        : 'Opcional: desligado (exige chave com créditos). A IA local está em uso.',
  };
  mapa.navegador = { id: 'navegador', estado: 'OK', resumo: 'Você está usando o sistema agora.' };
  return mapa;
}

/** Formata segundos como "2 h 15 min" / "35 min" / "40 s". */
export function duracao(segundos) {
  if (segundos == null) return '—';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${segundos} s`;
}

/** "8,6 s" a partir de milissegundos. */
export const segundosDe = (ms) =>
  ms == null ? '—' : `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
