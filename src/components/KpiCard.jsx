import { useId } from 'react';
import Icon from './Icon.jsx';

const ICONES = { green: 'clipboard', blue: 'layers', amber: 'folder', red: 'alert' };

/** Card de indicador (rótulo, valor, ícone em chip colorido, rodapé). `tooltip` explica o indicador (title + descrição acessível por foco). */
export default function KpiCard({
  label,
  value,
  hint,
  icon,
  tooltip,
  variant = 'green',
  loading = false,
}) {
  const tooltipId = useId();
  return (
    <div className={`card nx-kpi nx-kpi-${variant} h-100 shadow-sm`}>
      <div className="card-body">
        <div className="nx-kpi-top">
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
          <span className={`nx-kpi-ico nx-kpi-ico-${variant}`} aria-hidden="true">
            <Icon name={icon ?? ICONES[variant] ?? 'layers'} size={17} />
          </span>
        </div>
        {loading ? (
          <div className="placeholder-glow" role="status" aria-label={`Carregando ${label}`}>
            <span className="placeholder col-6" />
          </div>
        ) : (
          <div className="nx-kpi-value">{value ?? '—'}</div>
        )}
        {hint && <div className="nx-kpi-foot">{hint}</div>}
      </div>
    </div>
  );
}
