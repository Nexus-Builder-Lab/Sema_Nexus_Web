import { describe, expect, it } from 'vitest';
import {
  formatarTamanho,
  separarPalavras,
  TAMANHO_MAXIMO,
  validarArquivo,
  validarDocumento,
  VALORES_INICIAIS,
} from './validarDocumento.js';

const pdf = (extra = {}) => ({ name: 'laudo.PDF', size: 1000, ...extra });
const validos = {
  ...VALORES_INICIAIS,
  titulo: 'Laudo de vistoria',
  categoria: 'Relatório técnico',
  tipo: 'Laudo',
  dataDocumento: '2026-11-05',
};

describe('validarArquivo', () => {
  it('aceita as extensões permitidas sem diferenciar maiúsculas', () => {
    expect(validarArquivo(pdf())).toBeUndefined();
  });
  it('recusa extensão fora da lista, arquivo vazio, grande demais ou ausente', () => {
    expect(validarArquivo({ name: 'x.exe', size: 10 })).toMatch(/não permitido/);
    expect(validarArquivo({ name: 'semextensao', size: 10 })).toMatch(/não permitido/);
    expect(validarArquivo(pdf({ size: TAMANHO_MAXIMO + 1 }))).toMatch(/10 MB/);
    expect(validarArquivo(pdf({ size: 0 }))).toMatch(/vazio/);
    expect(validarArquivo(null)).toMatch(/Selecione/);
  });
});

describe('validarDocumento', () => {
  it('aceita dados válidos', () => {
    expect(validarDocumento(validos, pdf(), { hoje: '2026-11-11' })).toEqual({});
  });
  it('exige campos e rejeita data futura', () => {
    const erros = validarDocumento(VALORES_INICIAIS, null, { hoje: '2026-11-11' });
    expect(Object.keys(erros).sort()).toEqual(
      ['arquivo', 'categoria', 'dataDocumento', 'tipo', 'titulo'].sort(),
    );
    const futuro = validarDocumento({ ...validos, dataDocumento: '2026-12-01' }, pdf(), {
      hoje: '2026-11-11',
    });
    expect(futuro.dataDocumento).toMatch(/futura/);
  });
  it('limita as palavras-chave', () => {
    const muitas = Array.from({ length: 21 }, (_, i) => `p${i}`).join(',');
    const erros = validarDocumento({ ...validos, palavrasChave: muitas }, pdf(), {
      hoje: '2026-11-11',
    });
    expect(erros.palavrasChave).toMatch(/20/);
  });
});

describe('utilitários', () => {
  it('separa palavras e formata tamanhos', () => {
    expect(separarPalavras(' a, b ,,a')).toEqual(['a', 'b']);
    expect(formatarTamanho(512)).toBe('512 B');
    expect(formatarTamanho(2048)).toBe('2,0 KB');
  });
});
