import { describe, expect, it } from 'vitest';
import {
  extrair,
  extrairCampos,
  extrairMunicipios,
  palavrasChave,
  resumir,
  segmentar,
  verificar,
} from './analiseEngine.js';

const MUNS = ['Sinop', 'Mutum', 'Nova Mutum', 'Cuiabá', 'Colniza'];
const TEXTO = [
  'RELATÓRIO DE FISCALIZAÇÃO',
  'Processo: DEMO-2026/0012',
  'Demanda: DEM-2026/0010',
  'Município: Cuiabá',
  'Em 05 de novembro de 2026 e 10/11/2026 constatou-se supressão de 120,5 ha em Nova Mutum, com multa de R$ 15.000,00.',
  'Coordenadas -15,601 / -56,097. Vazão de 2,5 m³/s, 35% da área. Prazo para defesa: em até 30 dias.',
  'A conclusão recomenda embargo da área e notificação do responsável, conforme o relatório.',
].join('\n');

describe('analiseEngine', () => {
  it('extrai entidades por regras', () => {
    const ex = extrair(TEXTO, MUNS);
    expect(ex.processos).toEqual(['DEMO-2026/0012']);
    expect(ex.demandas).toEqual(['DEM-2026/0010']);
    expect(ex.datas.map((d) => d.iso)).toEqual(['2026-11-05', '2026-11-10']);
    expect(ex.areas).toEqual(['120,5 ha']);
    expect(ex.valores).toEqual(['R$ 15.000,00']);
    expect(ex.coordenadas).toEqual(['-15,601 / -56,097']);
    expect(ex.percentuais).toEqual(['35%']);
    expect(ex.vazoes).toEqual(['2,5 m³/s']);
    expect(ex.prazos).toEqual(['30 dias']);
  });

  it('municípios: nome contido em outro não conta sozinho', () => {
    expect(extrairMunicipios('Obra em Nova Mutum.', MUNS)).toEqual(['Nova Mutum']);
    expect(extrairMunicipios('Mutum e Nova Mutum.', MUNS).sort()).toEqual(['Mutum', 'Nova Mutum']);
    expect(extrairMunicipios('cuiaba, sinop', MUNS).sort()).toEqual(['Cuiabá', 'Sinop']);
  });

  it('campos "Rótulo: valor"', () => {
    const campos = extrairCampos(TEXTO);
    expect(campos).toContainEqual({ campo: 'Processo', valor: 'DEMO-2026/0012' });
    expect(campos).toContainEqual({ campo: 'Município', valor: 'Cuiabá' });
  });

  it('resumo extrativo reproduz frases do texto, sem título em caixa alta', () => {
    const r = resumir(TEXTO, 2);
    expect(r).toHaveLength(2);
    r.forEach((f) => expect(TEXTO).toContain(f));
    expect(r).not.toContain('RELATÓRIO DE FISCALIZAÇÃO');
  });

  it('termos frequentes só repetidos', () => {
    expect(palavrasChave('área área área embargo embargo vegetação')).toEqual([
      ['area', 3],
      ['embargo', 2],
    ]);
  });

  it('segmenta marcações sem perder texto', () => {
    const seg = segmentar(TEXTO);
    expect(seg.map((s) => s.texto).join('')).toBe(TEXTO);
    expect(seg.find((s) => s.tipo === 'proc').texto).toBe('DEMO-2026/0012');
    expect(seg.filter((s) => s.tipo === 'date')).toHaveLength(2);
  });

  it('verificações: município divergente, UF e datas', () => {
    const doc = {
      dataDocumento: '2026-11-01',
      municipio: { nome: 'Sinop' },
      demandas: [{ numero: 'DEM-2026/0010' }],
      textoExtraido: `${TEXTO} Também em Campo Grande/MS.`,
    };
    const v = verificar(doc, extrair(doc.textoExtraido, MUNS), '2026-11-12');
    const msgs = v.map((x) => x.texto).join(' | ');
    expect(msgs).toContain('município do cadastro (Sinop) não aparece');
    expect(msgs).toContain('UF diferente de MT');
    expect(msgs).toContain('datas posteriores');
    expect(msgs).toContain('demanda vinculada DEM-2026/0010 confere');
  });

  it('sem achados → mensagem de ok', () => {
    const v = verificar({}, extrair('texto simples', MUNS), '2026-11-12');
    expect(v).toEqual([
      { nivel: 'ok', texto: 'Nenhuma inconsistência identificada pelas regras disponíveis.' },
    ]);
  });
});
