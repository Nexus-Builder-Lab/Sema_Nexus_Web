import { useMemo } from 'react';
import {
  CircleMarker,
  GeoJSON,
  LayerGroup,
  LayersControl,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import {
  COR_DETER,
  COR_FOCO,
  NOME_CAMADA_DETER,
  NOME_CAMADA_FOCOS,
  rotuloDoBioma,
} from './mapaConfig.js';
import { criarPopupMunicipio, formatarDataHora } from './satelliteFormat.js';
import useGeoJson from './useGeoJson.js';

const rotuloTipo = { FOCO_CALOR: 'Foco de calor', DESMATAMENTO: 'Alerta DETER' };

function PopupSatelite({ ponto, fonte }) {
  return (
    <div className="small">
      <strong>{rotuloTipo[ponto.tipo] ?? ponto.tipo}</strong>
      <div>{formatarDataHora(ponto.dataHora)} (UTC)</div>
      <div>Satélite: {ponto.satelite ?? '—'}</div>
      {ponto.classe && <div>Classe: {ponto.classe}</div>}
      {ponto.areaKm2 != null && <div>Área: {ponto.areaKm2} km²</div>}
      <div>
        {ponto.municipio ?? 'Município não informado'} · {rotuloDoBioma(ponto.bioma)}
      </div>
      <div className="text-body-secondary">Fonte: {fonte} (não oficial da SEMA)</div>
    </div>
  );
}

function Pontos({ pontos, cor, fonte, raio }) {
  return pontos.map((p) => (
    <CircleMarker
      key={p.id}
      center={[p.latitude, p.longitude]}
      radius={raio}
      pathOptions={{ color: cor, weight: 0, fillColor: cor, fillOpacity: 0.55 }}
    >
      <Popup>
        <PopupSatelite ponto={p} fonte={fonte} />
      </Popup>
    </CircleMarker>
  ));
}

// Escala em 5 tons (relativa ao maior município) para o modo agregado.
const TONS = ['#fff1e6', '#ffd8a8', '#ffa94d', '#f76707', '#c2410c'];
function corDaContagem(total, maximo) {
  if (!total) return 'transparent';
  return TONS[Math.min(TONS.length - 1, Math.floor((total / maximo) * TONS.length))];
}

function Coropletico({ itens, fonte }) {
  const malha = useGeoJson('/geo/mt-municipios.geojson');
  const porId = useMemo(() => new Map(itens.map((i) => [Number(i.municipioId), i])), [itens]);
  const maximo = Math.max(1, ...itens.map((i) => i.total));
  if (!malha) return null;
  return (
    <GeoJSON
      key={`coropletico-${itens.map((i) => `${i.municipioId}:${i.total}`).join()}`}
      data={malha}
      style={(feature) => ({
        color: '#8a5a44',
        weight: 0.5,
        fillColor: corDaContagem(porId.get(Number(feature.properties?.id))?.total, maximo),
        fillOpacity: 0.75,
      })}
      onEachFeature={(feature, layer) => {
        const item = porId.get(Number(feature.properties?.id));
        layer.bindPopup(criarPopupMunicipio(feature.properties?.nome, item?.total, fonte));
      }}
    />
  );
}

/**
 * Camada de satélite do INPE (dados públicos reais, separados das demandas fictícias).
 * Entra como `children` do mapa: dois <LayersControl.Overlay> e um ouvinte de ligar/desligar
 * (`onToggle(tipo, ligada)`). `agregado` troca os pontos por coroplético por município.
 */
export default function SatelliteLayer({
  focos = [],
  deter = [],
  porMunicipio = [],
  agregado = false,
  temDeter = false,
  fonte = 'INPE — dados públicos',
  onToggle,
}) {
  const disparar = (nome, ligada) => {
    if (nome === NOME_CAMADA_FOCOS) onToggle?.('FOCO_CALOR', ligada);
    if (nome === NOME_CAMADA_DETER) onToggle?.('DESMATAMENTO', ligada);
  };
  useMapEvents({
    overlayadd: (e) => disparar(e.name, true),
    overlayremove: (e) => disparar(e.name, false),
  });

  return (
    <>
      <LayersControl.Overlay name={NOME_CAMADA_FOCOS}>
        <LayerGroup>
          {agregado ? (
            <Coropletico itens={porMunicipio} fonte={fonte} />
          ) : (
            <Pontos pontos={focos} cor={COR_FOCO} fonte={fonte} raio={3} />
          )}
        </LayerGroup>
      </LayersControl.Overlay>
      {temDeter && (
        <LayersControl.Overlay name={NOME_CAMADA_DETER}>
          <LayerGroup>
            <Pontos pontos={deter} cor={COR_DETER} fonte={fonte} raio={5} />
          </LayerGroup>
        </LayersControl.Overlay>
      )}
    </>
  );
}
