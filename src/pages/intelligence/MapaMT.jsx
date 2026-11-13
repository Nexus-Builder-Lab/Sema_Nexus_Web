import 'leaflet/dist/leaflet.css';
import {
  CircleMarker,
  GeoJSON,
  LayerGroup,
  LayersControl,
  MapContainer,
  Pane,
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
import ConcentracaoLayer from './ConcentracaoLayer.jsx';
import { COR_CONTORNO_UF } from './concentracao.js';
import useGeoJson from './useGeoJson.js';

export const PANE_FUNDO_UF = 'nx-fundo-uf';
const ESTILO_UF = { color: '#14532d', weight: 2, fillColor: '#e9f2ec', fillOpacity: 1 };
const ESTILO_MUNICIPIO = {
  color: '#94A3B8',
  weight: 0.6,
  fillColor: '#FFFFFF',
  fillOpacity: 0.55,
  className: 'nx-malha-municipio',
};
// Sobre a imagem de satélite a malha fica quase transparente, com contorno claro.
const ESTILO_MUNICIPIO_SATELITE = {
  ...ESTILO_MUNICIPIO,
  color: '#F8FAFC',
  weight: 0.8,
  fillOpacity: 0.05,
};
// Atribuição exigida pelos termos de uso da Esri (não ocultar).
const ATRIBUICAO_ESRI =
  'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a> | Imagens: Esri, Maxar, Earthstar Geographics e GIS User Community';
const ESTILO_CONTORNO = { color: COR_CONTORNO_UF, weight: 2.2, fill: false };

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ENTIDADES[c]);

/** Tooltip com o nome do município e destaque do contorno ao passar o mouse (Web#105). */
const nomeAoPassarOMouse = (estilo) => (feature, layer) => {
  layer.bindTooltip(`<strong>${escHtml(feature.properties?.nome ?? '')}</strong>`, {
    sticky: true,
    className: 'mun-tip',
  });
  layer.on({
    mouseover: () => layer.setStyle({ weight: 2, color: '#374151' }),
    mouseout: () => layer.setStyle(estilo),
  });
};

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
 * Mapa de Mato Grosso. Camadas: malha IBGE local (base), "Demandas (fictícias)" (modo Ocorrências),
 * coroplético de concentração por município e fundo online opcional (`fundo`: `osm` = OpenStreetMap, `satelite` = Esri
 * World Imagery via proxy `/tiles/esri` do Nginx; desligado por padrão). A camada "Focos de calor — INPE" (Web#22)
 * entra como mais um <LayersControl.Overlay> passado em `children`.
 */
export default function MapaMT({
  pontos = [],
  modo = 'pontos',
  concentracao = [],
  municipios = [],
  onSelecionarMunicipio,
  fundo = null,
  children,
}) {
  const uf = useGeoJson('/geo/mt-uf.geojson');
  const malha = useGeoJson('/geo/mt-municipios.geojson');
  const fundoOnline = Boolean(fundo);
  const estiloMalha = fundo === 'satelite' ? ESTILO_MUNICIPIO_SATELITE : ESTILO_MUNICIPIO;

  return (
    <MapContainer center={CENTRO_MT} zoom={ZOOM_MT} minZoom={5} scrollWheelZoom className="nx-map">
      {/* Pane próprio, abaixo do overlayPane (400) e acima dos tiles (200): o preenchimento da UF é
          recriado ao ligar/desligar o fundo online e, no overlayPane, entraria por cima das demais
          camadas (Web#103). */}
      <Pane name={PANE_FUNDO_UF} style={{ zIndex: 350 }}>
        {uf && (
          <GeoJSON
            key={`uf-${fundoOnline}`}
            data={uf}
            style={{ ...ESTILO_UF, fillOpacity: fundoOnline ? 0 : 1 }}
            interactive={false}
          />
        )}
      </Pane>
      {fundo === 'satelite' && (
        <TileLayer
          key="satelite"
          attribution={ATRIBUICAO_ESRI}
          url="/tiles/esri/{z}/{y}/{x}"
          maxNativeZoom={19}
        />
      )}
      {fundo === 'osm' && (
        <TileLayer
          key="osm"
          attribution="&copy; colaboradores do OpenStreetMap"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.55}
        />
      )}
      {malha && (
        // Interativa só fora do modo concentração (lá o ConcentracaoLayer, por cima, tem o próprio tooltip).
        <GeoJSON
          key={`malha-${modo === 'concentracao'}-${fundo === 'satelite'}`}
          data={malha}
          style={estiloMalha}
          interactive={modo !== 'concentracao'}
          onEachFeature={modo === 'concentracao' ? undefined : nomeAoPassarOMouse(estiloMalha)}
        />
      )}
      {malha && modo === 'concentracao' && (
        <ConcentracaoLayer
          malha={malha}
          itens={concentracao}
          municipios={municipios}
          onSelecionar={onSelecionarMunicipio}
        />
      )}
      {uf && <GeoJSON data={uf} style={ESTILO_CONTORNO} interactive={false} />}
      <LayersControl position="topright">
        <LayersControl.Overlay checked name="Demandas (fictícias)">
          <LayerGroup>
            {(modo === 'pontos' ? pontos : []).map((p) => (
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
