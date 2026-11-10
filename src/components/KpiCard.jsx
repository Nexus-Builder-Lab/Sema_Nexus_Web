export default function KpiCard({ label, value, hint, variant = 'green', loading = false }) {
  return (
    <div className={`card nx-kpi nx-kpi-${variant} h-100 shadow-sm`}>
      <div className="card-body">
        <div className="nx-kpi-label">{label}</div>
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
