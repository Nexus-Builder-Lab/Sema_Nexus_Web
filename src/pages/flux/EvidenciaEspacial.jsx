import { Link } from 'react-router-dom';

const REFERENCIAS = {
  COORDENADA: 'coordenada informada na demanda',
  AREA: 'centro da área informada na demanda',
  MUNICIPIO: 'município da demanda',
};

const formatarKm = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
const n = (v) => Number(v ?? 0).toLocaleString('pt-BR');

/**
 * Evidências espaciais da sugestão do Agente de Triagem (Issue API#132): raio e período usados,
 * contagens públicas do INPE, possíveis duplicatas por distância e documentos relacionados.
 * Só exibe; nada é gravado.
 */
export default function EvidenciaEspacial({ espacial }) {
  if (!espacial) return null;
  const { referencia, raioKm, inpe, demandasProximas = [], documentos = [] } = espacial;
  const porMunicipio = referencia === 'MUNICIPIO';
  return (
    <section className="nx-evidencia-espacial small mb-2" aria-labelledby="nx-evid-esp-titulo">
      <h3 id="nx-evid-esp-titulo" className="h6 mb-1">
        Evidências espaciais
      </h3>
      <p className="mb-1" data-testid="evidencia-referencia">
        Referência: {REFERENCIAS[referencia] ?? referencia}
        {!porMunicipio && raioKm != null && <>; raio de {formatarKm(raioKm)}</>}
        {inpe?.periodoDias != null && <>; período de {inpe.periodoDias} dias</>}.
      </p>
      {porMunicipio && (
        <div className="alert alert-info py-2 mb-2" role="note">
          Esta demanda não tem coordenada: as evidências foram buscadas por município, sem
          distâncias.
        </div>
      )}
      {inpe && (
        <>
          <h4 className="h6 fs-6 mb-1">Dados públicos do INPE</h4>
          <ul className="mb-2">
            {!porMunicipio && (
              <>
                <li>
                  {n(inpe.focosNoRaio)} foco(s) de calor no raio
                  {inpe.focoMaisProximoKm != null && (
                    <>; o mais próximo a {formatarKm(inpe.focoMaisProximoKm)}</>
                  )}
                </li>
                <li>
                  {n(inpe.alertasDeterNoRaio)} alerta(s) de desmatamento (DETER) no raio
                  {inpe.menorDistanciaDeterKm != null && (
                    <>; o mais próximo a {formatarKm(inpe.menorDistanciaDeterKm)}</>
                  )}
                </li>
                {inpe.dentroDePoligonoDeter && (
                  <li className="text-warning-emphasis">
                    O ponto está dentro de um polígono de alerta DETER.
                  </li>
                )}
              </>
            )}
            <li>
              No município: {n(inpe.focosMunicipio)} foco(s) de calor e{' '}
              {n(inpe.alertasDeterMunicipio)} alerta(s) DETER
            </li>
          </ul>
          {inpe.truncado && (
            <p className="text-body-secondary mb-2">
              Resultado limitado: há mais registros do que o exibido.
            </p>
          )}
        </>
      )}
      <h4 className="h6 fs-6 mb-1">Possíveis duplicatas geográficas</h4>
      {demandasProximas.length === 0 ? (
        <p className="mb-2 text-body-secondary">Nenhuma demanda próxima encontrada.</p>
      ) : (
        <ul className="mb-2">
          {demandasProximas.map((d) => (
            <li key={d.id}>
              <Link to={`/flux/demandas/${d.id}`} target="_blank" rel="noopener">
                {d.numero}
              </Link>{' '}
              — {d.titulo}
              {d.distanciaKm != null && <> (a {formatarKm(d.distanciaKm)})</>}
            </li>
          ))}
        </ul>
      )}
      <h4 className="h6 fs-6 mb-1">Documentos relacionados</h4>
      {documentos.length === 0 ? (
        <p className="mb-0 text-body-secondary">Nenhum documento relacionado.</p>
      ) : (
        <ul className="mb-0">
          {documentos.map((d) => (
            <li key={d.id}>
              <Link to={`/docia/documentos/${d.id}`} target="_blank" rel="noopener">
                {d.titulo}
              </Link>
              {d.motivo && <> — {d.motivo}</>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
