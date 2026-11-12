import { acaoDaTransicao, transicoesPermitidas, TRANSICOES } from './kanbanTransicoes.js';

const ADMIN = { id: 1, perfil: 'ADMIN' };

describe('transições do quadro', () => {
  it('cobre os 7 status e FINALIZADA não tem saída', () => {
    expect(Object.keys(TRANSICOES)).toHaveLength(7);
    expect(transicoesPermitidas({ status: 'FINALIZADA' }, ADMIN)).toEqual([]);
  });

  it('permite só os destinos válidos', () => {
    const d = { status: 'EM_TRIAGEM' };
    expect(acaoDaTransicao(d, 'AGUARDANDO_DISTRIBUICAO', ADMIN)).toBe('CONCLUIR_TRIAGEM');
    expect(acaoDaTransicao(d, 'PENDENTE', ADMIN)).toBe('SOLICITAR_COMPLEMENTACAO');
    expect(acaoDaTransicao(d, 'FINALIZADA', ADMIN)).toBeNull();
    expect(acaoDaTransicao({ status: 'PENDENTE' }, 'EM_ANDAMENTO', ADMIN)).toBeNull();
  });

  it('respeita o perfil (consulta não move nada)', () => {
    expect(transicoesPermitidas({ status: 'PENDENTE' }, { id: 9, perfil: 'CONSULTA' })).toEqual([]);
  });
});
