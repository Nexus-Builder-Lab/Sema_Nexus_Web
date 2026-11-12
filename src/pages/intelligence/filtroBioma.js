/** Municípios do bioma escolhido (campo `bioma` do catálogo); sem bioma, devolve todos. */
export function municipiosDoBioma(municipios, bioma) {
  const lista = municipios ?? [];
  return bioma ? lista.filter((m) => m.bioma === bioma) : lista;
}

/**
 * Aplica um novo bioma aos valores do filtro: o município selecionado é limpo
 * se não pertencer ao bioma escolhido.
 */
export function aplicarBioma(valores, bioma, municipios) {
  const atual = valores.municipioId;
  const pertence =
    !bioma ||
    !atual ||
    municipiosDoBioma(municipios, bioma).some((m) => String(m.id) === String(atual));
  return { ...valores, bioma, municipioId: pertence ? atual : '' };
}
