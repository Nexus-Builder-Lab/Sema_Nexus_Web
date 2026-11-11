import {
  COR_SEM_CATEGORIA,
  CORES_CATEGORIA,
  FONTE_MALHA,
  ROTULOS_CATEGORIA,
} from './mapaConfig.js';

function Bolinha({ cor }) {
  return (
    <span
      className="d-inline-block rounded-circle flex-shrink-0"
      style={{ width: 12, height: 12, backgroundColor: cor }}
      aria-hidden="true"
    />
  );
}

/** Legenda do mapa: cor por categoria e fonte da malha (IBGE). */
export default function MapLegend() {
  return (
    <section className="card shadow-sm" aria-label="Legenda do mapa">
      <div className="card-header bg-white">
        <h2 className="h6 mb-0">Legenda</h2>
      </div>
      <div className="card-body">
        <ul className="list-unstyled mb-3 small">
          {Object.entries(ROTULOS_CATEGORIA).map(([codigo, rotulo]) => (
            <li key={codigo} className="d-flex align-items-center gap-2 mb-1">
              <Bolinha cor={CORES_CATEGORIA[codigo]} />
              {rotulo}
            </li>
          ))}
          <li className="d-flex align-items-center gap-2">
            <Bolinha cor={COR_SEM_CATEGORIA} />
            Sem categoria
          </li>
        </ul>
        <p className="small text-body-secondary mb-1">
          Contorno tracejado: localização aproximada (centroide do município).
        </p>
        <p className="small text-body-secondary mb-0">{FONTE_MALHA}</p>
      </div>
    </section>
  );
}
