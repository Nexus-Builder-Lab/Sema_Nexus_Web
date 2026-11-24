/** Fixture de `POST /api/documentos/pre-analise` (dados fictícios; nada é gravado). */
export function preAnaliseMock() {
  return {
    titulo: 'Laudo de vistoria — Sinop',
    municipioId: 5107909,
    municipioNome: 'Sinop',
    dataDocumento: '2026-10-15',
    palavrasChave: ['vistoria', 'desmatamento', 'sinop'],
    vinculosDemanda: ['DEM-2026/0010'],
    textoExtraido: true,
    avisos: ['Modo demonstrativo: sugestões geradas por regras determinísticas.'],
  };
}
