import { describe, expect, it } from 'vitest';
import { aplicarBioma, municipiosDoBioma } from './filtroBioma.js';

const MUNS = [
  { id: 1, nome: 'Cuiabá', bioma: 'CERRADO' },
  { id: 2, nome: 'Sinop', bioma: 'AMAZONIA' },
  { id: 3, nome: 'Cáceres', bioma: 'PANTANAL' },
];

describe('filtroBioma', () => {
  it('restringe municípios ao bioma', () => {
    expect(municipiosDoBioma(MUNS, 'CERRADO').map((m) => m.nome)).toEqual(['Cuiabá']);
    expect(municipiosDoBioma(MUNS, '')).toHaveLength(3);
    expect(municipiosDoBioma(undefined, 'CERRADO')).toEqual([]);
  });

  it('limpa o município incompatível', () => {
    expect(aplicarBioma({ municipioId: '2', bioma: '' }, 'CERRADO', MUNS)).toEqual({
      municipioId: '',
      bioma: 'CERRADO',
    });
  });

  it('mantém o município compatível ou sem bioma', () => {
    expect(aplicarBioma({ municipioId: '1' }, 'CERRADO', MUNS).municipioId).toBe('1');
    expect(aplicarBioma({ municipioId: '2' }, '', MUNS).municipioId).toBe('2');
  });
});
