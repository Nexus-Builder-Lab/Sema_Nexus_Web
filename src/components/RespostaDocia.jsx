import { useId } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { EXPLICACAO_SIMILARIDADE, SeloRecuperacao, SeloSimilaridade } from './RecuperacaoDocia.jsx';

const SEM_INFORMACAO = /^n[aã]o h[aá] informa[cç][aã]o suficiente/i;

/**
 * A aderência textual (alta/média/baixa) vem da busca textual da API e é relativa ao documento com mais
 * termos da pergunta: não é a probabilidade de a resposta estar correta (relatório técnico, P2).
 */
export const EXPLICACAO_ADERENCIA =
  'Aderência textual: quanto o documento contém os termos da pergunta, em comparação com o documento ' +
  'mais aderente desta busca. Não é a probabilidade de a resposta estar correta — confira o trecho citado.';
export function Avatar() {
  return (
    <span className="nx-ai-avatar" aria-hidden="true">
      <Icon name="assistant" size={16} />
    </span>
  );
}

export default function Resposta({ item }) {
  const semInfo = SEM_INFORMACAO.test(item.resposta ?? '');
  const comAgente = item.agente === 'LOCAL' || item.agente === 'CLAUDE';
  const idExplicacao = useId();
  const temAderencia = (item.referencias ?? []).some((r) => r.aderenciaTextual);
  const temSimilaridade = (item.referencias ?? []).some((r) => r.similaridadeSemantica != null);
  return (
    <div className="nx-ai-row" data-testid="resposta">
      <Avatar />
      <div className="nx-ai-bubble">
        <div className="nx-ai-mode" data-testid="modo-resposta">
          <Icon name={comAgente ? 'sparkles' : 'flask'} size={12} />
          {item.modo || 'Modo não informado'}
        </div>
        {comAgente && (
          <span className="badge nx-agente-selo mb-2" data-testid="agente-resposta">
            {item.agente === 'CLAUDE' ? 'Claude' : 'IA local'} · {item.modelo}
          </span>
        )}
        <SeloRecuperacao recuperacao={item.recuperacao} className="mb-2" />
        <p className={`mb-2 ${semInfo ? 'text-body-secondary fst-italic' : ''}`}>{item.resposta}</p>
        {item.referencias?.length > 0 && (
          <>
            <h3 className="h6">Referências</h3>
            <ul className="list-unstyled mb-0">
              {item.referencias.map((r, i) => (
                <li key={`${r.documentoId}-${i}`} className="mb-2">
                  <Link to={`/docia/documentos/${r.documentoId}`}>{r.titulo}</Link>
                  {r.aderenciaTextual && (
                    <span
                      className="badge text-bg-light border ms-2 fw-normal"
                      data-testid="aderencia-textual"
                      title={EXPLICACAO_ADERENCIA}
                      aria-describedby={idExplicacao}
                    >
                      Aderência textual: {r.aderenciaTextual}
                    </span>
                  )}
                  <SeloSimilaridade valor={r.similaridadeSemantica} idExplicacao={idExplicacao} />
                  <blockquote className="small text-body-secondary border-start ps-2 mb-0">
                    {r.trecho}
                  </blockquote>
                </li>
              ))}
            </ul>
            {/* Sempre que um selo aponta para esta explicação, ela existe no DOM (aria-describedby válido). */}
            {(temAderencia || temSimilaridade) && (
              <p
                className="small text-body-secondary mb-0"
                id={idExplicacao}
                data-testid="explicacao-aderencia"
              >
                {[temAderencia && EXPLICACAO_ADERENCIA, temSimilaridade && EXPLICACAO_SIMILARIDADE]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            )}
          </>
        )}
        {comAgente && item.passos?.length > 0 && (
          <details className="small mt-2">
            <summary>Como o agente chegou à resposta</summary>
            <ul className="mb-0 mt-1">
              {item.passos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
