/**
 * Paginação no padrão Spring (página 0-based).
 * Mostra no máximo 5 números ao redor da página atual.
 */
export default function Pagination({ page = 0, totalPages, totalElements, onPageChange }) {
  if (!totalPages || totalPages <= 1) {
    return totalElements != null ? (
      <p className="small text-body-secondary mb-0">{totalElements} registro(s)</p>
    ) : null;
  }

  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  const pages = [];
  for (let i = start; i < end; i += 1) pages.push(i);

  const go = (target) => {
    if (target >= 0 && target < totalPages && target !== page) onPageChange?.(target);
  };
  const isFirst = page <= 0;
  const isLast = page >= totalPages - 1;

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <p className="small text-body-secondary mb-0">
        Página {page + 1} de {totalPages}
        {totalElements != null && ` · ${totalElements} registro(s)`}
      </p>
      <nav aria-label="Paginação">
        <ul className="pagination pagination-sm mb-0 flex-wrap">
          <li className={`page-item ${isFirst ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => go(page - 1)}
              disabled={isFirst}
            >
              Anterior
            </button>
          </li>
          {pages.map((p) => (
            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => go(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p + 1}`}
              >
                {p + 1}
              </button>
            </li>
          ))}
          <li className={`page-item ${isLast ? 'disabled' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => go(page + 1)}
              disabled={isLast}
            >
              Próxima
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
