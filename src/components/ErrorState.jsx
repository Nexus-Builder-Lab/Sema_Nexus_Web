import Icon from './Icon.jsx';

export default function ErrorState({
  title = 'Não foi possível carregar os dados',
  message = 'Tente novamente em instantes.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`alert alert-danger d-flex gap-2 align-items-start ${className}`.trim()}
      role="alert"
    >
      <Icon name="alert" className="mt-1" />
      <div className="flex-grow-1">
        <p className="fw-semibold mb-1">{title}</p>
        {message && <p className="mb-0">{message}</p>}
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline-danger mt-2" onClick={onRetry}>
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
