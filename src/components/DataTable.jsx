import { useMemo, useState } from 'react';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import Icon from './Icon.jsx';
import Loading from './Loading.jsx';
import Pagination from './Pagination.jsx';

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function valueOf(column, row) {
  if (column.sortValue) return column.sortValue(row);
  return row[column.key];
}

/**
 * Tabela com ordenação por coluna, paginação e estados de carregamento, erro e vazio.
 *
 * - columns: [{ key, header, sortable?, render?(row), sortValue?(row), className? }]
 * - Ordenação local por padrão. Com `onSortChange`, fica controlada (ordenação no servidor):
 *   a tabela só emite `{ key, direction }` e exibe `sort`.
 * - pagination: { page (0-based), totalPages, totalElements, onPageChange }
 */
export default function DataTable({
  columns,
  rows = [],
  rowKey = 'id',
  caption,
  loading = false,
  error = null,
  onRetry,
  emptyTitle,
  emptyMessage,
  sort,
  onSortChange,
  initialSort = null,
  pagination,
}) {
  const [localSort, setLocalSort] = useState(initialSort);
  const controlled = typeof onSortChange === 'function';
  const activeSort = controlled ? sort : localSort;

  const sortedRows = useMemo(() => {
    if (controlled || !activeSort?.key) return rows;
    const column = columns.find((c) => c.key === activeSort.key);
    if (!column) return rows;
    const factor = activeSort.direction === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => factor * compare(valueOf(column, a), valueOf(column, b)));
  }, [rows, columns, activeSort, controlled]);

  function toggleSort(key) {
    const direction = activeSort?.key === key && activeSort.direction === 'asc' ? 'desc' : 'asc';
    const next = { key, direction };
    if (controlled) onSortChange(next);
    else setLocalSort(next);
  }

  const getKey = (row, index) =>
    typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] ?? index);

  let content;
  if (loading) {
    content = <Loading />;
  } else if (error) {
    content = (
      <div className="p-3">
        <ErrorState message={error.message || String(error)} onRetry={onRetry} />
      </div>
    );
  } else if (rows.length === 0) {
    content = <EmptyState title={emptyTitle} message={emptyMessage} />;
  } else {
    content = (
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 nx-table">
          {caption && <caption className="visually-hidden">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => {
                const isSorted = activeSort?.key === column.key;
                const ariaSort = isSorted
                  ? activeSort.direction === 'desc'
                    ? 'descending'
                    : 'ascending'
                  : column.sortable
                    ? 'none'
                    : undefined;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={column.className}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="nx-sort-btn"
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.header}
                        <Icon
                          name={
                            isSorted
                              ? activeSort.direction === 'desc'
                                ? 'sortDesc'
                                : 'sortAsc'
                              : 'sort'
                          }
                          className="opacity-75"
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr key={getKey(row, index)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render ? column.render(row) : (row[column.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      {content}
      {pagination && !loading && !error && rows.length > 0 && (
        <div className="card-footer bg-white">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}
