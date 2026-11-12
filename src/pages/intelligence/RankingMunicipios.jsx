import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import { rotuloDoBioma } from './mapaConfig.js';

/** Painel "Regiões com maior concentração": top 10 com barra; clique filtra pelo município. */
export default function RankingMunicipios({
  itens,
  municipios = [],
  carregando,
  erro,
  onRetry,
  onSelecionar,
}) {
  const top = itens.slice(0, 10);
  const max = top.length ? top[0].total : 1;
  const regiao = new Map(municipios.map((m) => [Number(m.id), m.regiao]));
  return (
    <section className="card shadow-sm mb-3" aria-label="Regiões com maior concentração">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">Regiões com maior concentração</h2>
        <span className="small text-body-secondary">Clique para filtrar</span>
      </div>
      {carregando ? (
        <Loading message="Carregando ranking..." />
      ) : erro ? (
        <ErrorState message={erro.message || 'Falha ao obter o ranking.'} onRetry={onRetry} />
      ) : top.length === 0 ? (
        <EmptyState title="Sem demandas" message="Ajuste os filtros." className="py-3" />
      ) : (
        <ol className="list-unstyled mb-0 nx-ranking">
          {top.map((m, i) => {
            const reg = regiao.get(Number(m.municipioId));
            return (
              <li key={m.municipioId}>
                <button
                  type="button"
                  className="nx-ranking-item"
                  onClick={() => onSelecionar(m.municipioId)}
                  aria-label={`Filtrar por ${m.municipio}: ${m.total} ${m.total === 1 ? 'demanda' : 'demandas'}`}
                >
                  <span className={`nx-ranking-pos${i < 3 ? ' top' : ''}`}>{i + 1}</span>
                  <span className="flex-grow-1 min-w-0">
                    <span className="d-block fw-semibold">{m.municipio}</span>
                    <span className="d-block small text-body-secondary">
                      {rotuloDoBioma(m.bioma)}
                      {reg ? ` · Região ${reg}` : ''}
                    </span>
                    <span className="nx-ranking-bar">
                      <span style={{ width: `${(m.total / max) * 100}%` }} />
                    </span>
                  </span>
                  <span className="fw-semibold">{m.total}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
