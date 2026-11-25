/**
 * Rótulo curto de setor para eixos e legendas de gráficos.
 * "Núcleo Regional de Fiscalização — Sinop (fictício)" → "NR Sinop".
 * O nome completo continua no tooltip e nas tabelas.
 */
export function rotuloCurtoSetor(nome) {
  if (!nome) return '';
  const limpo = String(nome)
    .replace(/\s*\((fictício|demonstração|demonstrativo)\)\s*$/i, '')
    .trim();
  const nucleo = limpo.match(/^N[úu]cleo\s+Regional\b.*?[—–-]\s*(.+)$/i);
  if (nucleo) return `NR ${nucleo[1].trim()}`;
  return limpo.length > 22 ? `${limpo.slice(0, 21).trimEnd()}…` : limpo;
}
