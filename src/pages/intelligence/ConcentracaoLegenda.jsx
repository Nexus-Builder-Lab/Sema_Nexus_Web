import { faixasLegenda, maximoDe } from './concentracao.js';

/** Legenda sobreposta ao mapa no modo concentração. */
export default function ConcentracaoLegenda({ itens }) {
  const faixas = faixasLegenda(maximoDe(itens));
  return (
    <div className="nx-map-legend" role="group" aria-label="Legenda da concentração por município">
      <h3>Ocorrências por município</h3>
      {faixas.map((f) => (
        <div key={f.cor} className="d-flex align-items-center gap-2">
          <i style={{ background: f.cor }} aria-hidden="true" />
          até {f.ate}
        </div>
      ))}
      <div className="small text-body-secondary mt-1">Clique em um município para filtrar</div>
    </div>
  );
}
