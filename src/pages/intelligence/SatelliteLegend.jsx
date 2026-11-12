import { COR_DETER, COR_FOCO } from './mapaConfig.js';
import { formatarData } from './satelliteFormat.js';

function Bolinha({ cor, tamanho }) {
  return (
    <span
      className="d-inline-block rounded-circle flex-shrink-0"
      style={{ width: tamanho, height: tamanho, backgroundColor: cor }}
      aria-hidden="true"
    />
  );
}

/** Legenda e atribuição da camada INPE: só aparece com a camada ligada. */
export default function SatelliteLegend({ focos, deter, agregado, atualizadoEm }) {
  if (!focos && !deter) return null;
  return (
    <section className="card shadow-sm border-warning mt-3" aria-label="Legenda da camada INPE">
      <div className="card-header bg-white">
        <h2 className="h6 mb-0">Camada de satélite (INPE)</h2>
      </div>
      <div className="card-body small">
        <ul className="list-unstyled mb-2">
          {focos && (
            <li className="d-flex align-items-center gap-2 mb-1">
              <Bolinha cor={COR_FOCO} tamanho={8} />
              {agregado ? 'Focos de calor por município (tons de laranja)' : 'Foco de calor'}
            </li>
          )}
          {deter && (
            <li className="d-flex align-items-center gap-2">
              <Bolinha cor={COR_DETER} tamanho={10} />
              Alerta de desmatamento (DETER)
            </li>
          )}
        </ul>
        <p className="mb-0 fw-semibold" role="note">
          Fonte: INPE — dados públicos, não oficiais da SEMA. Atualizado em{' '}
          {formatarData(atualizadoEm)}
        </p>
      </div>
    </section>
  );
}
