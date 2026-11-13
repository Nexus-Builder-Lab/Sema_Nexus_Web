/** Rótulo do motor que gerou a sugestão do agente (a IA é sempre identificada). */
export function rotuloModo(sugestao) {
  if (sugestao.modo === 'LOCAL') return `IA local · ${sugestao.modelo}`;
  if (sugestao.modo === 'CLAUDE') return `Claude · ${sugestao.modelo}`;
  return 'Regras locais (sem IA generativa)';
}
