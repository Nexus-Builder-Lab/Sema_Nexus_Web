import { GeoJSON } from 'react-leaflet';
import { COR_CONTORNO_MUNICIPIO, corDaClasse, maximoDe } from './concentracao.js';
import { rotuloDoBioma } from './mapaConfig.js';

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ENTIDADES[c]);

/**
 * Coroplético de concentração por município: 5 faixas, tooltip (nome, total e bioma) ao passar o mouse,
 * destaque no hover e clique que filtra pelo município. `municipios` = catálogo (id, nome, bioma).
 */
export default function ConcentracaoLayer({ malha, itens, municipios, onSelecionar }) {
  const total = new Map(itens.map((i) => [Number(i.municipioId), i.total]));
  const catalogo = new Map(municipios.map((m) => [Number(m.id), m]));
  const max = maximoDe(itens);

  const estilo = (f) => {
    const n = total.get(Number(f.properties.id)) || 0;
    return {
      color: COR_CONTORNO_MUNICIPIO,
      weight: 0.6,
      fillColor: corDaClasse(n, max),
      fillOpacity: n ? 0.85 : 0,
    };
  };

  const aoCadaMunicipio = (f, layer) => {
    const id = Number(f.properties.id);
    const m = catalogo.get(id);
    const item = itens.find((i) => Number(i.municipioId) === id);
    const nome = m?.nome ?? item?.municipio ?? f.properties.nome;
    const n = total.get(id) || 0;
    const bioma = rotuloDoBioma(m?.bioma ?? item?.bioma);
    layer.bindTooltip(
      `<strong>${escHtml(nome)}</strong><br>${n} ${n === 1 ? 'demanda' : 'demandas'} · ${escHtml(bioma)}`,
      { sticky: true, className: 'mun-tip' },
    );
    layer.on({
      mouseover: () => layer.setStyle({ weight: 2, color: '#374151' }),
      mouseout: () => layer.setStyle(estilo(f)),
      click: () => onSelecionar?.(id),
    });
  };

  // `key` força o redesenho quando os dados mudam (o GeoJSON do Leaflet não reaplica o estilo sozinho).
  const chave = itens.map((i) => `${i.municipioId}:${i.total}`).join(',');
  return (
    <GeoJSON key={`conc-${chave}`} data={malha} style={estilo} onEachFeature={aoCadaMunicipio} />
  );
}
