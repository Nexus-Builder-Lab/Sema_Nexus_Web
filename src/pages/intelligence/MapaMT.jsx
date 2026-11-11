import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  CircleMarker,
  GeoJSON,
  LayerGroup,
  LayersControl,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import {
  CENTRO_MT,
  ROTULOS_STATUS,
  ZOOM_MT,
  corDaCategoria,
  rotuloDaCategoria,
} from './mapaConfig.js';

const ESTILO_UF = { color: '#14532d', weight: 2, fillColor: '#e9f2ec', fillOpacity: 1 };
const ESTILO_MUNICIPIO = { color: '#8aa595', weight: 0.6, fillOpacity: 0 };

/** Carrega a malha GeoJSON local (public/geo) — o mapa funciona sem internet. */
function useGeoJson(url) {
  const [dados, setDados] = useState(null);
  useEffect(() => {
    let ativo = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => ativo && setDados(json))
      .catch(() => ativo && setDados(null));
    return () => {
      ativo = false;
    };
  }, [url]);
  return dados;
}

function PopupDemanda({ ponto }) {
  return (
    <div className="small">
      <strong>{ponto.numero}</strong>
      <div>{ponto.titulo}</div>
      <div className="text-body-secondary">
        {ponto.municipio} · {rotuloDaCategoria(ponto.categoria)}
      </div>
      <div>Status: {ROTULOS_STATUS[ponto.status] ?? ponto.status}</div>
      {ponto.coordenadaAproximada && <div>Localização aproximada (centroide do município)</div>}
      <Link to={`/flux/demandas/${ponto.demandaId}`}>Abrir demanda {ponto.numero}</Link>
    </div>
  );
}

/**
 * Mapa de Mato Grosso. Camadas: malha IBGE local (base), "Demandas (fictícias)" (ligada) e
 * tiles OpenStreetMap (desligados por padrão). A camada "Focos de calor — INPE" (Web#22)
 * entra como mais um <LayersControl.Overlay> passado em `children`.
 */
export default function MapaMT({ pontos = [], children }) {
  const uf = useGeoJson('/geo/mt-uf.geojson');
  const municipios = useGeoJson('/geo/mt-municipios.geojson');

  return (
    <MapContainer center={CENTRO_MT} zoom={ZOOM_MT} minZoom={5} scrollWheelZoom className="nx-map">
      {uf && <GeoJSON data={uf} style={ESTILO_UF} interactive={false} />}
      {municipios && <GeoJSON data={municipios} style={ESTILO_MUNICIPIO} interactive={false} />}
      <LayersControl position="topright">
        <LayersControl.Overlay name="Tiles OpenStreetMap (requer internet)">
          <TileLayer
            attribution="&copy; colaboradores do OpenStreetMap"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.Overlay>
        <LayersControl.Overlay checked name="Demandas (fictícias)">
          <LayerGroup>
            {pontos.map((p) => (
              <CircleMarker
                key={p.demandaId}
                center={[p.latitude, p.longitude]}
                radius={8}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  dashArray: p.coordenadaAproximada ? '3 2' : undefined,
                  fillColor: corDaCategoria(p.categoria),
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <PopupDemanda ponto={p} />
                </Popup>
              </CircleMarker>
            ))}
          </LayerGroup>
        </LayersControl.Overlay>
        {children}
      </LayersControl>
    </MapContainer>
  );
}
