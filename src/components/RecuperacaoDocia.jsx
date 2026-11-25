import { useId } from 'react';

/**
 * Como a API recuperou os documentos (`recuperacao` de RespostaAssistente e PesquisaDocumentos). Em ambos os
 * casos a explicação deixa claro que os índices são proximidade com a pergunta, não probabilidade de acerto.
 */
export const EXPLICACAO_RECUPERACAO =
  'Por palavras: os documentos foram encontrados pelos termos e radicais da pergunta. ' +
  'Híbrida: a busca por palavras foi combinada com similaridade semântica (embeddings locais). ' +
  'Em ambos os casos, os índices mostram proximidade com a pergunta e NÃO são a probabilidade de a resposta estar correta — confira o trecho citado.';

/** Explicação da similaridade semântica (cosseno), mostrada só quando a API a informa. */
export const EXPLICACAO_SIMILARIDADE =
  'Similaridade semântica: proximidade de sentido entre a pergunta e o trecho (cosseno, normalmente entre 0 e 1). ' +
  'Não é confiança nem probabilidade de a resposta estar correta.';

const ROTULOS_RECUPERACAO = {
  LEXICAL: 'Busca: por palavras',
  HIBRIDA: 'Busca: híbrida (palavras + semântica)',
};

/**
 * Selo do modo de recuperação com explicação associada por `aria-describedby`. `explicacaoId` permite que outros
 * elementos (ex.: similaridades de uma tabela) apontem para a mesma explicação. Nada é exibido se o modo for desconhecido.
 */
export function SeloRecuperacao({ recuperacao, className = '', explicacaoId, complemento }) {
  const idInterno = useId();
  const idExplicacao = explicacaoId ?? idInterno;
  const rotulo = ROTULOS_RECUPERACAO[recuperacao];
  if (!rotulo) return null;
  return (
    <div className={className}>
      <span
        className="badge text-bg-info-subtle border border-info-subtle text-info-emphasis fw-normal"
        data-testid="recuperacao"
        data-recuperacao={recuperacao}
        aria-describedby={idExplicacao}
      >
        {rotulo}
      </span>
      <p
        className="small text-body-secondary mb-0 mt-1"
        id={idExplicacao}
        data-testid="explicacao-recuperacao"
      >
        {EXPLICACAO_RECUPERACAO}
        {complemento ? ` ${complemento}` : ''}
      </p>
    </div>
  );
}

/** Formata a similaridade com duas casas decimais (pt-BR). */
function formatarSimilaridade(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Selo "Similaridade semântica: 0,71" com explicação; só renderiza quando há valor numérico. */
export function SeloSimilaridade({ valor, idExplicacao }) {
  if (valor == null || Number.isNaN(Number(valor))) return null;
  return (
    <span
      className="badge text-bg-light border ms-2 fw-normal"
      data-testid="similaridade-semantica"
      title={EXPLICACAO_SIMILARIDADE}
      aria-describedby={idExplicacao}
    >
      Similaridade semântica: {formatarSimilaridade(valor)}
    </span>
  );
}
