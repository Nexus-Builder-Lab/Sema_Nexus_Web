// Datas da API chegam como "AAAA-MM-DD" (sem fuso). Evita `new Date(string)`, que interpreta como UTC.

/** Data de hoje (fuso local) no formato "AAAA-MM-DD". */
export function hojeISO(agora = new Date()) {
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** "2026-11-10" → "10/11/2026"; vazio → "—". */
export function formatarData(iso) {
  if (!iso) return '—';
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—';
}
