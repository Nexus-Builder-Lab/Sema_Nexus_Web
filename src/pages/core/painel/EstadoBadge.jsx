import { estadoInfo } from './estados.js';

/** Selo de estado (Operando / Atenção / Indisponível …) com a latência, quando houver. */
export default function EstadoBadge({ estado, latenciaMs }) {
  const info = estadoInfo(estado);
  return (
    <span className={`nx-painel-estado ${info.classe}`} data-testid="estado">
      <span className="nx-painel-bolinha" aria-hidden="true" />
      {info.rotulo}
      {latenciaMs != null && <span className="opacity-75"> · {latenciaMs} ms</span>}
    </span>
  );
}
