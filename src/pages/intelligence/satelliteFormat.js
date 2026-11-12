/** `AAAA-MM-DDTHH:mm:ss` (UTC) → `dd/mm/aaaa`. */
export function formatarData(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** `AAAA-MM-DDTHH:mm:ss` (UTC) → `dd/mm/aaaa HH:mm`. */
export function formatarDataHora(iso) {
  if (!iso) return '—';
  return `${formatarData(iso)} ${String(iso).slice(11, 16)}`;
}
