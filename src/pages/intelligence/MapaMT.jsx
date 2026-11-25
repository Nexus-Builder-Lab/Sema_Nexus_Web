import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import {
  CircleMarker,
  GeoJSON,
  LayerGroup,
  LayersControl,
  MapContainer,
  Pane,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import {
  CENTRO_MT,
  PANE_INPE_AREAS,
  PANE_SELECAO,
  ROTULOS_STATUS,
  ZOOM_MT,
  corDaCategoria,
  rotuloDaCategoria,
} from './mapaConfig.js';
import ConcentracaoLayer from './ConcentracaoLayer.jsx';
import { COR_CONTORNO_UF } from './concentracao.js';
import useGeoJson from './useGeoJson.js';
import { limitesDaGeometria } from './selecaoMapa.js';

export const PANE_FUNDO_UF = 'nx-fundo-uf';
export const PANE_MALHA = 'nx-malha';
export const PANE_CONCENTRACAO = 'nx-concentracao';
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

/** Aproxima o mapa do polígono selecionado (sem mexer no zoom quando a seleção é só um ponto). */
function AjustarSelecao({ geometria }) {
  const mapa = useMap();
  useEffect(() => {
    const limites = limitesDaGeometria(geometria);
    if (!limites) return;
    const tamanho = mapa.getSize();
    if (!tamanho.x || !tamanho.y) return; // sem área visível (ex.: testes em jsdom)
    mapa.fitBounds(limites, { maxZoom: 14, padding: [24, 24] });
  }, [mapa, geometria]);
  return null;
}

/**
 * Foco vindo de um Action Card (`?lat&lon&zoom`): centraliza o mapa no ponto e o marca com um anel (pane da seleção,
 * não interativo). Aplica-se quando o foco muda (carga da página); depois, clicar num item (AjustarSelecao) prevalece.
 */
function FocarPonto({ foco }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.setView([foco.lat, foco.lon], foco.zoom ?? 12);
  }, [mapa, foco]);
  return (
    <CircleMarker
      center={[foco.lat, foco.lon]}
      radius={13}
      pane={PANE_SELECAO}
      interactive={false}
      className="nx-selecao-ponto nx-foco-url"
      pathOptions={{ color: '#d9480f', weight: 3, dashArray: '4 3', fill: false }}
    />
  );
}

/**
 * Destaque da seleção (área afetada): polígono (DETER ou demanda) e anel no ponto. Fica no pane PANE_SELECAO (390),
 * abaixo do overlayPane, e não é interativo: nunca cobre nem rouba o clique dos marcadores (Web#109).
 */
function DestaqueSelecao({ selecao }) {
  if (!selecao) return null;
  const { geometria, latitude, longitude, cor, chave } = selecao;
  return (
    <>
      {geometria && (
        <GeoJSON
          key={`selecao-${chave}`}
          data={geometria}
          interactive={false}
          style={{
            color: cor,
            weight: 3,
            fillColor: cor,
            fillOpacity: 0.3,
            className: 'nx-selecao-area',
          }}
        />
      )}
      {latitude != null && longitude != null && (
        <CircleMarker
          key={`selecao-ponto-${chave}`}
          center={[latitude, longitude]}
          radius={13}
          interactive={false}
          className="nx-selecao-ponto"
          pathOptions={{ color: cor, weight: 3, dashArray: '4 3', fill: false }}
        />
      )}
      <AjustarSelecao geometria={geometria} />
    </>
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
  selecao = null,
  onSelecionarDemanda,
  foco = null,
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
      {/* Malha e coroplético são recriados (key) quando o fundo/os dados mudam. Em panes próprios abaixo do
          overlayPane (400) eles nunca ficam por cima dos marcadores de demanda e do INPE, que seguem
          clicáveis (Web#109). */}
      <Pane name={PANE_MALHA} style={{ zIndex: 360 }}>
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
      </Pane>
      {/* Áreas do INPE (coroplético agregado) entram neste pane pela prop `pane` (SatelliteLayer). */}
      <Pane name={PANE_INPE_AREAS} style={{ zIndex: 380 }} />
      {/* Área afetada do item selecionado (polígono DETER/demanda e anel do ponto), sempre abaixo dos marcadores. */}
      <Pane name={PANE_SELECAO} style={{ zIndex: 390 }}>
        {foco && <FocarPonto foco={foco} />}
        <DestaqueSelecao selecao={selecao} />
      </Pane>
      <Pane name={PANE_CONCENTRACAO} style={{ zIndex: 370 }}>
        {malha && modo === 'concentracao' && (
          <ConcentracaoLayer
            malha={malha}
            itens={concentracao}
            municipios={municipios}
            onSelecionar={onSelecionarMunicipio}
          />
        )}
      </Pane>
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
                eventHandlers={{ click: () => onSelecionarDemanda?.(p) }}
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
