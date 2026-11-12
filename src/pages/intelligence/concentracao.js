// Mapa de concentração por município (coroplético), parâmetros iguais ao protótipo (PARIDADE_PROTOTIPO.md).
export const ESCALA = ['#FFF7ED', '#FED7AA', '#FDBA74', '#FB923C', '#EA580C', '#9A3412'];
export const COR_CONTORNO_MUNICIPIO = '#9CA3AF';
export const COR_CONTORNO_UF = '#14532D';

/** Classe 1..5 = min(5, ceil(n/max*5)); 0 quando não há demandas. */
export function classeDe(total, max) {
  if (!total || !max) return 0;
  return Math.min(5, Math.ceil((total / max) * 5));
}

export const corDaClasse = (total, max) => (total ? ESCALA[classeDe(total, max)] : 'transparent');

export const maximoDe = (itens) => Math.max(1, ...itens.map((i) => i.total));

/** Faixas da legenda: "até X" em 5 classes. */
export function faixasLegenda(max) {
  return [1, 2, 3, 4, 5].map((i) => ({ cor: ESCALA[i], ate: Math.ceil((max * i) / 5) }));
}

const dois = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

/** Períodos rápidos (chips). */
export const PERIODOS = [
  { id: '30d', rotulo: '30 dias' },
  { id: '90d', rotulo: '90 dias' },
  { id: '6m', rotulo: '6 meses' },
  { id: '12m', rotulo: '12 meses' },
  { id: 'estiagem', rotulo: 'Estiagem jul–out' },
];

/** Intervalo `{ de, ate }` (AAAA-MM-DD) do período rápido. `hoje` é injetável para teste. */
export function intervaloDoPeriodo(id, hoje = new Date()) {
  const de = new Date(hoje);
  if (id === '30d') de.setDate(de.getDate() - 30);
  else if (id === '90d') de.setDate(de.getDate() - 90);
  else if (id === '6m') de.setMonth(de.getMonth() - 6);
  else if (id === '12m') de.setFullYear(de.getFullYear() - 1);
  else if (id === 'estiagem') {
    // Estiagem: 1.º de julho a 31 de outubro (do ano corrente, ou do anterior se ainda não começou).
    const ano = hoje.getMonth() < 6 ? hoje.getFullYear() - 1 : hoje.getFullYear();
    return { de: `${ano}-07-01`, ate: `${ano}-10-31` };
  }
  return { de: iso(de), ate: iso(hoje) };
}

/** CSV (separador ";") com os indicadores por município. */
export function gerarCsv(itens) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const linhas = [['Município', 'Bioma', 'Demandas'].map(esc).join(';')];
  itens.forEach((i) => linhas.push([esc(i.municipio), esc(i.bioma), i.total].join(';')));
  return linhas.join('\r\n');
}
