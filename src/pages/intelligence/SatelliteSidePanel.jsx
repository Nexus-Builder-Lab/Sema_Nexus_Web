import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import { formatarData } from './satelliteFormat.js';

/** Painel "Referência por satélite (INPE)": total no período e top 5 municípios. Dados reais, separados dos fictícios. */
export default function SatelliteSidePanel({
  carregando,
  erro,
  onRetry,
  total,
  itens,
  atualizadoEm,
}) {
  const top = (itens ?? []).slice(0, 5);
  return (
    <section
      className="card shadow-sm border-warning mb-3"
      aria-label="Referência por satélite (INPE)"
    >
      <div className="card-header bg-warning-subtle">
        <h2 className="h6 mb-0">Referência por satélite (INPE)</h2>
        <span className="badge text-bg-warning mt-1">Dados públicos reais — não fictícios</span>
      </div>
      <div className="card-body small">
        {carregando ? (
          <Loading message="Carregando referência do INPE..." />
        ) : erro ? (
          <ErrorState
            message={erro.message || 'Falha ao obter a referência do INPE.'}
            onRetry={onRetry}
            className="mb-0"
          />
        ) : (
          <>
            <p className="mb-2">
              <span className="fs-4 fw-bold d-block">{total ?? 0}</span>
              focos de calor no período
            </p>
            {top.length === 0 ? (
              <p className="text-body-secondary mb-2">Nenhum foco no período selecionado.</p>
            ) : (
              <>
                <h3 className="h6">Top 5 municípios</h3>
                <ol className="mb-2 ps-3">
                  {top.map((i) => (
                    <li key={i.municipioId}>
                      {i.municipio} — {i.total}
                    </li>
                  ))}
                </ol>
              </>
            )}
            <p className="mb-0 text-body-secondary">
              Fonte: INPE — dados públicos, não oficiais da SEMA. Atualizado em{' '}
              {formatarData(atualizadoEm)}. Não entra nos indicadores fictícios.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
