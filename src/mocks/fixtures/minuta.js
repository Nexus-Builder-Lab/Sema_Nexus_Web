/** Fixture de `POST /api/demandas/{id}/minuta-vistoria` (dados fictícios; nada é gravado). */
export function minutaVistoriaMock(id) {
  const numero = `DEM-2026/${String(id).padStart(4, '0')}`;
  const aviso = 'MINUTA GERADA PARA REVISÃO HUMANA — AMBIENTE DEMONSTRATIVO';
  return {
    aviso,
    modo: 'DEMONSTRATIVO',
    modelo: null,
    demandaId: Number(id),
    numero,
    nomeArquivoSugerido: `minuta-vistoria-${numero.replace('/', '-')}.md`,
    markdown: `> ${aviso}\n\n# Minuta de relatório de vistoria — ${numero}\n\n## Identificação\n- **Demanda:** ${numero}\n\n## Conclusões preliminares\nTexto fictício para revisão.\n`,
    evidencias: ['Dossiê da demanda'],
    avisos: ['Modo demonstrativo: minuta por template, sem IA generativa.'],
  };
}
