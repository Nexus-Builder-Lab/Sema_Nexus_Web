import { csvProdutividade, gerarCsv, modeloDemandas, modeloProdutividade } from './modelos.js';

describe('modelos de relatório', () => {
  it('modeloDemandas calcula KPIs e distribuição', () => {
    const pagina = {
      totalElements: 3,
      content: [
        { categoria: 'A', status: 'FINALIZADA', prazo: '2026-01-01' },
        { categoria: 'A', status: 'EM_ANDAMENTO', prazo: '2026-01-01' },
        { categoria: 'B', status: 'EM_ANDAMENTO', prazo: '2099-01-01' },
      ],
    };
    const m = modeloDemandas(pagina, (v) => v, '2026-11-10');
    expect(m.kpis.map((k) => k.valor)).toEqual(['3', '1', '2', '1']);
    expect(m.secoes[0].rows[0]).toEqual(['A', '2', '66,7%']);
    expect(m.truncado).toBe(false);
  });

  it('gerarCsv tem BOM, aviso, separador e proteção de fórmula', () => {
    const csv = gerarCsv(['a', 'b'], [['=1+1', 'x;y']]);
    expect(
      csv.startsWith(String.fromCharCode(0xfeff) + 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS\r\n'),
    ).toBe(true);
    expect(csv).toContain('\'=1+1;"x;y"');
  });

  it('csvProdutividade junta setores e servidores', () => {
    const m = modeloProdutividade({
      kpis: {},
      porSetorSituacao: [
        { setorId: 1, setor: 'S', total: 2, concluidas: 1, ativas: 1, atrasadas: 0 },
      ],
      porResponsavel: [{ fiscal: 'F', total: 1, concluidas: 1, ativas: 0, atrasadas: 0 }],
    });
    const { rows } = csvProdutividade(m);
    expect(rows.map((r) => r[0])).toEqual(['Setor', 'Servidor']);
    expect(rows[0]).toHaveLength(8);
    expect(rows[1]).toHaveLength(8);
  });
});
