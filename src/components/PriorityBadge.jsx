import { PRIORIDADES, buscarNoCatalogo } from '../utils/catalogos.js';

export default function PriorityBadge({ prioridade }) {
  const { label, color } = buscarNoCatalogo(PRIORIDADES, prioridade);
  return (
    <span className={`nx-badge nx-badge-${color}`}>
      <span className="visually-hidden">Prioridade </span>
      {label}
    </span>
  );
}
