import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { explicarComparacao } from '../../api/comparacaoApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';

const SITUACAO = {
  ALTERADO: { rotulo: 'Alterado', badge: 'nx-badge-amber' },
  REMOVIDO: { rotulo: 'Removido', badge: 'nx-badge-red' },
  ADICIONADO: { rotulo: 'Adicionado', badge: 'nx-badge-green' },
};

const CATEGORIA = {
  AREA: 'Área',
  VAZAO: 'Vazão',
  VALOR: 'Valor',
  DATA: 'Data',
  PRAZO: 'Prazo',
  PERCENTUAL: 'Percentual',
  CONCLUSAO: 'Conclusão',
};

/** Rótulo do motor do resumo (a origem é sempre identificada). */
function rotuloModoExplicacao(r) {
  if (r.modo === 'LOCAL') return `IA local · ${r.modelo ?? 'modelo local'}`;
  if (r.modo === 'CLAUDE') return `Claude · ${r.modelo ?? 'modelo'}`;
  return 'Demonstrativo (regras, sem IA)';
}

const num = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const variacao = (v, sufixo = '') =>
  v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${num(v)}${sufixo}`;

/** Botão "Explicar impacto das diferenças" + tabela de grandezas, resumo e selo do modo. */
export default function ExplicarImpacto({ aId, bId }) {
  const [estado, setEstado] = useState({ fase: 'ocioso', res: null, erro: null });
  const [tentativa, setTentativa] = useState(0);

  // Trocar de documentos descarta a explicação anterior.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado({ fase: 'ocioso', res: null, erro: null });
    setTentativa(0);
  }, [aId, bId]);

  useEffect(() => {
    if (tentativa === 0) return undefined;
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado({ fase: 'carregando', res: null, erro: null });
    explicarComparacao(aId, bId).then(
      (res) => ativo && setEstado({ fase: 'ok', res, erro: null }),
      (e) =>
        ativo &&
        setEstado({
          fase: 'erro',
          res: null,
          erro: mensagemDeErro(e, 'Não foi possível explicar as diferenças.'),
        }),
    );
    return () => {
      ativo = false;
    };
  }, [aId, bId, tentativa]);

  const { fase, res, erro } = estado;
  const grandezas = res?.grandezas ?? [];

  return (
    <div className="card mb-4" data-testid="explicar-impacto">
      <div className="card-header bg-transparent d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 mb-0">Impacto das diferenças</h2>
        <button
          type="button"
          className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1"
          disabled={fase === 'carregando'}
          onClick={() => setTentativa((n) => n + 1)}
        >
          <Sparkles size={14} aria-hidden="true" />
          Explicar impacto das diferenças
        </button>
      </div>
      <div className="card-body" aria-live="polite">
        {fase === 'ocioso' && (
          <p className="text-body-secondary small mb-0">
            Lista as grandezas que mudaram (áreas, vazões, valores, datas, prazos e percentuais) e
            resume o impacto. Os números vêm da extração determinística; só o resumo pode ser
            escrito pela IA.
          </p>
        )}
        {fase === 'carregando' && (
          <Loading message="Explicando as diferenças… a primeira chamada pode levar de 30 a 50 s." />
        )}
        {fase === 'erro' && (
          <div data-testid="erro-explicacao">
            <ErrorState message={erro} onRetry={() => setTentativa((n) => n + 1)} />
          </div>
        )}
        {fase === 'ok' && (
          <div data-testid="explicacao">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
              <span className="badge nx-agente-selo" data-testid="explicacao-modo">
                {rotuloModoExplicacao(res)}
              </span>
              <span className="small text-body-secondary">
                {res.resumoGeradoPorIa
                  ? 'Resumo escrito por IA; a tabela não vem do modelo.'
                  : 'Resumo por regras, sem IA generativa.'}
              </span>
            </div>
            <p data-testid="explicacao-resumo">{res.resumo}</p>
            {grandezas.length ? (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <caption>
                    Grandezas que mudaram entre os documentos
                    {res.grandezasIguais > 0 && ` (${res.grandezasIguais} idênticas não listadas)`}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Grandeza</th>
                      <th scope="col">Situação</th>
                      <th scope="col">Antes (A)</th>
                      <th scope="col">Depois (B)</th>
                      <th scope="col" className="text-end">
                        Variação absoluta
                      </th>
                      <th scope="col" className="text-end">
                        Variação %
                      </th>
                      <th scope="col">Unidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grandezas.map((g, i) => {
                      const s = SITUACAO[g.situacao] ?? {
                        rotulo: g.situacao,
                        badge: 'nx-badge-gray',
                      };
                      return (
                        <tr key={`${g.categoria}-${g.rotuloA ?? g.rotuloB}-${i}`}>
                          <th scope="row" className="fw-semibold">
                            {g.rotuloA ?? g.rotuloB}{' '}
                            <span className="nx-badge nx-badge-gray">
                              {CATEGORIA[g.categoria] ?? g.categoria}
                            </span>
                          </th>
                          <td>
                            <span className={`nx-badge ${s.badge}`}>{s.rotulo}</span>
                          </td>
                          <td>{g.valorA ?? '—'}</td>
                          <td>{g.valorB ?? '—'}</td>
                          <td className="text-end">{variacao(g.variacaoAbsoluta)}</td>
                          <td className="text-end">{variacao(g.variacaoPercentual, '%')}</td>
                          <td>{g.unidade ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-body-secondary mb-0">
                Nenhuma grandeza mudou entre os documentos.
              </p>
            )}
            {res.aviso && <p className="small text-body-secondary mb-0">{res.aviso}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
