import { describe, expect, it } from 'vitest';
import { rotuloCurtoSetor } from './rotulos.js';

describe('rotuloCurtoSetor', () => {
  it('abrevia núcleos regionais', () => {
    expect(rotuloCurtoSetor('Núcleo Regional de Fiscalização — Sinop (fictício)')).toBe('NR Sinop');
  });
  it('mantém nomes curtos e trunca longos', () => {
    expect(rotuloCurtoSetor('Gabinete (demonstração)')).toBe('Gabinete');
    expect(rotuloCurtoSetor('Setor de Fiscalização Ambiental Integrada')).toHaveLength(22);
    expect(rotuloCurtoSetor(null)).toBe('');
  });
});
