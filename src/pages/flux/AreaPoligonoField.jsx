import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Pane,
  Polygon,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  analisarGeometria,
  contarVertices,
  dentroDeMt,
  extrairGeometriaGeoJson,
  fecharPoligonoPontos,
} from '../../utils/geometriaArea.js';
import { CENTRO_MT, ZOOM_MT } from '../intelligence/mapaConfig.js';
import { formatarHectares, limitesDaGeometria } from '../intelligence/selecaoMapa.js';
import useGeoJson from '../intelligence/useGeoJson.js';
import { LIMITES } from './validarDemanda.js';

const ESTILO_UF = { color: '#14532d', weight: 2, fillColor: '#e9f2ec', fillOpacity: 1 };
const ESTILO_MALHA = { color: '#94A3B8', weight: 0.6, fillColor: '#FFFFFF', fillOpacity: 0.55 };
const ESTILO_POLIGONO = { color: '#1864ab', weight: 3, fillColor: '#1864ab', fillOpacity: 0.25 };

function AjustarPoligono({ geometria }) {
  const mapa = useMap();
  useEffect(() => {
    const limites = limitesDaGeometria(geometria);
    if (!limites) return;
    const tamanho = mapa.getSize();
    if (!tamanho.x || !tamanho.y) return;
    mapa.fitBounds(limites, { maxZoom: 14, padding: [24, 24] });
  }, [mapa, geometria]);
  return null;
}

function OuvinteDesenho({ ativo, aoAdicionar }) {
  useMapEvents({
    click(e) {
      if (ativo) aoAdicionar([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function centroideNoRetangulo({ latitude, longitude }) {
  return (
    latitude >= LIMITES.latitude.min &&
    latitude <= LIMITES.latitude.max &&
    longitude >= LIMITES.longitude.min &&
    longitude <= LIMITES.longitude.max
  );
}

/**
 * Campo de área afetada da demanda: desenho interativo de polígono no Leaflet, importação de
 * `.geojson` (preenchendo área em ha e centroide) e remoção na edição (`removerArea`).
 */
export default function AreaPoligonoField({
  areaGeometria,
  areaHa,
  removerArea,
  editando,
  tinhaArea,
  disabled,
  erroAreaHa,
  erroAreaGeometria,
  onChangeAreaHa,
  onAplicarGeometria,
  onRemoverArea,
  onDesfazerRemocao,
}) {
  const uf = useGeoJson('/geo/mt-uf.geojson');
  const malha = useGeoJson('/geo/mt-municipios.geojson');
  const [desenhando, setDesenhando] = useState(false);
  const [rascunho, setRascunho] = useState([]);
  const [erroLocal, setErroLocal] = useState(null);

  const analise = areaGeometria ? analisarGeometria(areaGeometria) : null;
  const vertices = areaGeometria ? contarVertices(areaGeometria) : 0;
  const haFormatado = analise?.ok ? formatarHectares(analise.areaHa) : null;

  function iniciarDesenho() {
    setErroLocal(null);
    setRascunho([]);
    setDesenhando(true);
  }

  function adicionarPonto([lat, lon]) {
    if (!dentroDeMt(lat, lon)) {
      setErroLocal('O ponto clicado está fora dos limites de Mato Grosso.');
      return;
    }
    setErroLocal(null);
    setRascunho((atual) => [...atual, [lat, lon]]);
  }

  function concluirDesenho() {
    const res = fecharPoligonoPontos(rascunho);
    if (!res.ok) {
      setErroLocal(res.erro);
      return;
    }
    setErroLocal(null);
    setDesenhando(false);
    setRascunho([]);
    onAplicarGeometria({
      geometria: res.geometria,
      areaHa: res.areaHa,
      centroide: res.centroide && centroideNoRetangulo(res.centroide) ? res.centroide : null,
    });
  }

  function cancelarDesenho() {
    setErroLocal(null);
    setDesenhando(false);
    setRascunho([]);
  }

  async function importarGeoJson(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setErroLocal(null);
    setDesenhando(false);
    setRascunho([]);
    try {
      const texto = await arquivo.text();
      const res = extrairGeometriaGeoJson(texto);
      if (!res.ok) {
        setErroLocal(res.erro);
        return;
      }
      onAplicarGeometria({
        geometria: res.geometria,
        areaHa: res.areaHa,
        centroide: res.centroide && centroideNoRetangulo(res.centroide) ? res.centroide : null,
      });
    } catch {
      setErroLocal('Não foi possível ler o arquivo GeoJSON.');
    }
  }

  const erroExibido = erroLocal || erroAreaGeometria;
  const podeRemover =
    !removerArea &&
    (Boolean(areaGeometria) || Boolean(String(areaHa ?? '').trim()) || (editando && tinhaArea));

  return (
    <div className="col-12">
      <div className="border rounded p-3 bg-light-subtle">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div>
            <h2 className="h6 mb-0">Área afetada e polígono (opcional)</h2>
            <p className="small text-body-secondary mb-0">
              Desenhe no mapa ou importe um <code>.geojson</code> (WGS84, dentro de Mato Grosso)
              para preencher área (ha) e centroide.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {!desenhando ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  disabled={disabled}
                  onClick={iniciarDesenho}
                >
                  Desenhar polígono
                </button>
                <label
                  htmlFor="importar-geojson"
                  className={`btn btn-outline-secondary btn-sm mb-0${disabled ? ' disabled' : ''}`}
                >
                  Importar .geojson
                </label>
                <input
                  id="importar-geojson"
                  type="file"
                  accept=".geojson,.json,application/geo+json,application/json"
                  className="visually-hidden"
                  disabled={disabled}
                  onChange={importarGeoJson}
                />
                {podeRemover && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    disabled={disabled}
                    onClick={() => {
                      setErroLocal(null);
                      onRemoverArea();
                    }}
                  >
                    Remover área afetada
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={disabled || rascunho.length === 0}
                  onClick={() => setRascunho((atual) => atual.slice(0, -1))}
                >
                  Desfazer ponto
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={disabled || rascunho.length < 3}
                  onClick={concluirDesenho}
                >
                  Concluir polígono
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={disabled}
                  onClick={cancelarDesenho}
                >
                  Cancelar desenho
                </button>
              </>
            )}
          </div>
        </div>

        {removerArea && (
          <div
            className="alert alert-warning py-2 d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2"
            role="status"
          >
            <span className="small">A área afetada será removida ao salvar as alterações.</span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={disabled}
              onClick={onDesfazerRemocao}
            >
              Desfazer remoção
            </button>
          </div>
        )}

        <div className="row g-3 align-items-start mb-2">
          <div className="col-12 col-md-4">
            <label htmlFor="areaHa" className="form-label">
              Área afetada (ha)
            </label>
            <input
              id="areaHa"
              type="text"
              inputMode="decimal"
              readOnly={Boolean(areaGeometria)}
              aria-invalid={erroAreaHa ? 'true' : undefined}
              aria-describedby={erroAreaHa ? 'areaHa-erro areaHa-ajuda' : 'areaHa-ajuda'}
              className={`form-control${erroAreaHa ? ' is-invalid' : ''}`}
              value={areaHa}
              onChange={(e) => onChangeAreaHa(e.target.value)}
            />
            <div id="areaHa-ajuda" className="form-text">
              {areaGeometria
                ? 'Calculada automaticamente pelo polígono (mínimo 0,01 ha).'
                : 'Opcional (mínimo 0,01 ha).'}
            </div>
            {erroAreaHa && (
              <div id="areaHa-erro" className="invalid-feedback d-block">
                {erroAreaHa}
              </div>
            )}
          </div>
          <div className="col-12 col-md-8 d-flex align-items-center" aria-live="polite">
            {desenhando ? (
              <p className="small text-primary mb-0 mt-md-4">
                Modo de desenho ativo: clique no mapa para adicionar vértices ({rascunho.length}{' '}
                {rascunho.length === 1 ? 'ponto' : 'pontos'}). Mínimo de 3 pontos.
              </p>
            ) : areaGeometria ? (
              <p className="small text-body-secondary mb-0 mt-md-4">
                Polígono ativo ({vertices} vértices{haFormatado ? ` · ${haFormatado}` : ''}). O
                centroide preenche latitude e longitude.
              </p>
            ) : (
              <p className="small text-body-secondary mb-0 mt-md-4">
                Nenhum polígono desenhado ou importado.
              </p>
            )}
          </div>
        </div>

        {erroExibido && (
          <div className="alert alert-danger py-2 small mb-2" role="alert">
            {erroExibido}
          </div>
        )}

        <div className="nx-map-area-editor">
          <MapContainer
            center={CENTRO_MT}
            zoom={ZOOM_MT}
            minZoom={5}
            scrollWheelZoom
            className={`nx-map nx-map-sm${desenhando ? ' nx-map-desenho' : ''}`}
          >
            <Pane name="nx-editor-uf" style={{ zIndex: 350 }}>
              {uf && <GeoJSON data={uf} style={ESTILO_UF} interactive={false} />}
            </Pane>
            <Pane name="nx-editor-malha" style={{ zIndex: 360 }}>
              {malha && <GeoJSON data={malha} style={ESTILO_MALHA} interactive={false} />}
            </Pane>
            <OuvinteDesenho ativo={desenhando} aoAdicionar={adicionarPonto} />
            {areaGeometria && !desenhando && (
              <>
                <GeoJSON
                  key={JSON.stringify(areaGeometria)}
                  data={areaGeometria}
                  style={ESTILO_POLIGONO}
                  interactive={false}
                />
                <AjustarPoligono geometria={areaGeometria} />
              </>
            )}
            {desenhando && rascunho.length >= 3 && (
              <Polygon positions={rascunho} pathOptions={ESTILO_POLIGONO} />
            )}
            {desenhando && rascunho.length >= 2 && (
              <Polyline positions={rascunho} pathOptions={{ color: '#1864ab', dashArray: '4 4' }} />
            )}
            {desenhando &&
              rascunho.map((p, idx) => (
                <CircleMarker
                  key={`${idx}-${p[0]}-${p[1]}`}
                  center={p}
                  radius={idx === 0 ? 7 : 5}
                  pathOptions={{
                    color: '#1864ab',
                    fillColor: idx === 0 ? '#16a34a' : '#fff',
                    fillOpacity: 1,
                    weight: 2,
                  }}
                  eventHandlers={
                    idx === 0 && rascunho.length >= 3 ? { click: concluirDesenho } : undefined
                  }
                />
              ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
