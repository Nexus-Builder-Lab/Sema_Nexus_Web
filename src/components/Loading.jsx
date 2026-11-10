export default function Loading({ message = 'Carregando...', className = '' }) {
  return (
    <div
      className={`d-flex align-items-center justify-content-center gap-2 py-4 text-body-secondary ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
