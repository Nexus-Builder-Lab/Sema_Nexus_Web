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

/** Dias entre `de` e `ate` ("AAAA-MM-DD"); positivo quando `ate` é posterior. */
export function diasEntre(de, ate) {
  const [a1, m1, d1] = String(de).slice(0, 10).split('-').map(Number);
  const [a2, m2, d2] = String(ate).slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
}
