import { useId } from 'react';

/** Card de indicador. `tooltip` explica o indicador (title + descrição acessível por foco). */
export default function KpiCard({
  label,
  value,
  hint,
  tooltip,
  variant = 'green',
  loading = false,
}) {
  const tooltipId = useId();
  return (
    <div className={`card nx-kpi nx-kpi-${variant} h-100 shadow-sm`}>
      <div className="card-body">
        <div className="nx-kpi-label">
          {label}
          {tooltip && (
            <>
              <button
                type="button"
                className="nx-kpi-info"
                title={tooltip}
                aria-label={`Sobre o indicador ${label}`}
                aria-describedby={tooltipId}
              >
                i
              </button>
              <span id={tooltipId} className="visually-hidden">
                {tooltip}
              </span>
            </>
          )}
        </div>
        {loading ? (
          <div className="placeholder-glow" role="status" aria-label={`Carregando ${label}`}>
            <span className="placeholder col-6" />
          </div>
        ) : (
          <div className="nx-kpi-value">{value ?? '—'}</div>
        )}
        {hint && <div className="small text-body-secondary mt-1">{hint}</div>}
      </div>
    </div>
  );
}
