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

/** Popup do coroplético como nó DOM (textContent): nome/fonte vêm da API/malha e nunca viram HTML. */
export function criarPopupMunicipio(nome, total, fonte) {
  const no = document.createElement('div');
  no.textContent = `${nome}: ${total ?? 0} foco(s) de calor — Fonte: ${fonte}`;
  return no;
}
