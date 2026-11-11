/** Valida o período dos filtros (AAAA-MM-DD); devolve a mensagem de erro ou `null`. */
export function validarPeriodo({ de, ate }) {
  if (de && ate && de > ate) return 'A data inicial não pode ser posterior à data final.';
  return null;
}
