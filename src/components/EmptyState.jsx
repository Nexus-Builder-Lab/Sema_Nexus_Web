import Icon from './Icon.jsx';

export default function EmptyState({
  title = 'Nenhum registro encontrado',
  message,
  action,
  className = '',
}) {
  return (
    <div className={`text-center py-5 px-3 text-body-secondary ${className}`.trim()}>
      <Icon name="inbox" className="mb-2 text-secondary" />
      <p className="fw-semibold text-body mb-1">{title}</p>
      {message && <p className="mb-0">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
