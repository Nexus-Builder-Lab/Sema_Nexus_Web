// Fixture do Assistente Global (API#139): nos mocks não há IA, responde no modo demonstrativo.
export function respostaAssistenteGlobalMock(pergunta = '') {
  const prazo = /prazo|vencid/i.test(pergunta);
  return {
    aviso: 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS',
    modo: 'DEMONSTRATIVO',
    modelo: null,
    resposta: prazo
      ? 'Há 2 demandas com prazo vencido nos dados fictícios: DEM-2026/0010 e DEM-2026/0012.'
      : 'Resumo demonstrativo: consulte os indicadores ambientais e as demandas pelos atalhos abaixo.',
    links: prazo
      ? [
          {
            tipo: 'DEMANDA',
            rotulo: 'DEM-2026/0010 — Supressão de vegetação',
            url: '/flux/demandas/10',
          },
          { tipo: 'TELA', rotulo: 'Demandas atrasadas', url: '/flux/demandas?atrasada=true' },
        ]
      : [{ tipo: 'TELA', rotulo: 'Dashboard ambiental', url: '/intelligence' }],
    ferramentas: [prazo ? 'prazos_criticos' : 'resumo_indicadores_ambientais'],
    evidencias: [],
    avisos: [],
  };
}
