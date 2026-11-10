import { STATUS_DEMANDA, buscarNoCatalogo } from '../utils/catalogos.js';

/** Badge do status da demanda (7 status do fluxo). O texto sempre acompanha a cor. */
export default function StatusBadge({ status }) {
  const { label, color } = buscarNoCatalogo(STATUS_DEMANDA, status);
  return <span className={`nx-badge nx-badge-${color}`}>{label}</span>;
}
