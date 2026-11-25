// Validação dos links devolvidos pelo Assistente Global: só rotas internas conhecidas do app.
// O texto da API nunca vira HTML e URLs externas, `//host`, `javascript:` etc. são ignorados.
const ROTAS = [
  /^\/$/,
  /^\/intelligence(\/(inteligencia-ambiental|indicadores|relatorios))?$/,
  /^\/flux\/(painel|kanban|prazos|produtividade|demandas)$/,
  /^\/flux\/demandas\/(nova|\d+|\d+\/editar)$/,
  /^\/docia\/(documentos|assistente|analise|comparacao)$/,
  /^\/docia\/documentos\/(novo|\d+)$/,
  /^\/admin(\/(estrutura|perfis|auditoria))?$/,
  /^\/sistema\/painel$/,
];

/** `true` se `url` é um caminho interno (começa com "/") que corresponde a uma rota conhecida. */
export function linkInternoValido(url) {
  if (typeof url !== 'string' || url.length > 300) return false;
  if (!url.startsWith('/') || url.startsWith('//') || /[\\\s]/.test(url)) return false;
  const caminho = url.split(/[?#]/)[0];
  return ROTAS.some((rota) => rota.test(caminho));
}

/** Mantém só os links com `url` válida e `rotulo` textual. */
export function linksValidos(links) {
  if (!Array.isArray(links)) return [];
  return links.filter((l) => l && typeof l.rotulo === 'string' && linkInternoValido(l.url));
}
