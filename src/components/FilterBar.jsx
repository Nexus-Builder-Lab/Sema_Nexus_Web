/** Barra de filtros: os campos vêm como children; Filtrar envia, Limpar restaura. */
export default function FilterBar({
  children,
  onSubmit,
  onClear,
  label = 'Filtros',
  submitLabel = 'Filtrar',
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(event);
  }

  return (
    <form
      className="card card-body shadow-sm mb-3"
      role="search"
      aria-label={label}
      onSubmit={handleSubmit}
    >
      <div className="row g-2 align-items-end">
        {children}
        <div className="col-12 col-md-auto d-flex gap-2">
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
          {onClear && (
            <button type="button" className="btn btn-outline-secondary" onClick={onClear}>
              Limpar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
