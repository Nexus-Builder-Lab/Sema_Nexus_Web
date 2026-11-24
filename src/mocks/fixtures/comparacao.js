/** Fixture de `POST /api/docia/comparacao/explicar` (dados fictícios; modo demonstrativo). */
export function explicacaoComparacaoMock(aId, bId) {
  return {
    aviso: 'Resumo demonstrativo: tabela extraída de forma determinística. Documentos fictícios.',
    modo: 'DEMONSTRATIVO',
    resumoGeradoPorIa: false,
    modelo: null,
    resumo:
      'A área outorgada subiu de 120 para 150 ha, o prazo passou de 10 para 15 dias e a multa foi removida.',
    a: { id: aId, titulo: 'Parecer 014/2026 v1' },
    b: { id: bId, titulo: 'Parecer 014/2026 v2' },
    similaridade: 82.5,
    grandezas: [
      {
        categoria: 'AREA',
        situacao: 'ALTERADO',
        rotuloA: 'Área outorgada',
        valorA: '120 ha',
        rotuloB: 'Área outorgada',
        valorB: '150 ha',
        variacaoAbsoluta: 30,
        variacaoPercentual: 25,
        unidade: 'ha',
      },
      {
        categoria: 'PRAZO',
        situacao: 'ALTERADO',
        rotuloA: 'Prazo de resposta',
        valorA: '10 dias',
        rotuloB: 'Prazo de resposta',
        valorB: '15 dias',
        variacaoAbsoluta: 5,
        variacaoPercentual: 50,
        unidade: 'dias',
      },
      {
        categoria: 'VALOR',
        situacao: 'REMOVIDO',
        rotuloA: 'Multa',
        valorA: 'R$ 5.000,00',
        variacaoAbsoluta: null,
        variacaoPercentual: null,
        unidade: 'R$',
      },
    ],
    grandezasIguais: 2,
    passos: ['Extraiu grandezas dos dois textos.', 'Comparou por rótulo.'],
  };
}
