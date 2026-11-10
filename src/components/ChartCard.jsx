import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import Loading from './Loading.jsx';

/** Moldura para gráficos com estados de carregamento, erro e vazio. */
export default function ChartCard({
  title,
  subtitle,
  actions,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyMessage = 'Sem dados para o período selecionado.',
  children,
}) {
  let body = children;
  if (loading) body = <Loading />;
  else if (error) body = <ErrorState message={error.message || String(error)} onRetry={onRetry} />;
  else if (empty) body = <EmptyState title="Sem dados" message={emptyMessage} />;

  return (
    <section className="card h-100 shadow-sm" aria-label={title}>
      <div className="card-header bg-white d-flex justify-content-between align-items-start gap-2">
        <div>
          <h2 className="h6 mb-0">{title}</h2>
          {subtitle && <div className="small text-body-secondary">{subtitle}</div>}
        </div>
        {actions}
      </div>
      <div className="card-body nx-chart-body">{body}</div>
    </section>
  );
}
