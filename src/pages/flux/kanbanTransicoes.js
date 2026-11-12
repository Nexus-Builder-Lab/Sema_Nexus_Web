import { acoesDisponiveis } from '../../auth/perfis.js';

/** Transições válidas da máquina de estados (espelham as ações da tela de detalhes). */
export const TRANSICOES = {
  PENDENTE: [{ para: 'EM_TRIAGEM', acao: 'INICIAR_TRIAGEM' }],
  EM_TRIAGEM: [
    { para: 'AGUARDANDO_DISTRIBUICAO', acao: 'CONCLUIR_TRIAGEM' },
    { para: 'PENDENTE', acao: 'SOLICITAR_COMPLEMENTACAO' },
  ],
  AGUARDANDO_DISTRIBUICAO: [{ para: 'DISTRIBUIDA', acao: 'DISTRIBUIR' }],
  DISTRIBUIDA: [{ para: 'EM_ANDAMENTO', acao: 'INICIAR_EXECUCAO' }],
  EM_ANDAMENTO: [{ para: 'AGUARDANDO_CONCLUSAO', acao: 'REGISTRAR_FISCALIZACAO' }],
  AGUARDANDO_CONCLUSAO: [
    { para: 'FINALIZADA', acao: 'CONCLUIR' },
    { para: 'EM_ANDAMENTO', acao: 'DEVOLVER' },
  ],
  FINALIZADA: [],
};

/** Transições que o usuário pode iniciar a partir do status da demanda (a API é quem autoriza). */
export function transicoesPermitidas(demanda, usuario) {
  const acoes = acoesDisponiveis(demanda.status, usuario, demanda);
  return (TRANSICOES[demanda.status] ?? []).filter((t) => acoes.includes(t.acao));
}

/** Ação a abrir ao mover `demanda` para `destino`, ou `null` se a transição for inválida. */
export function acaoDaTransicao(demanda, destino, usuario) {
  return transicoesPermitidas(demanda, usuario).find((t) => t.para === destino)?.acao ?? null;
}
