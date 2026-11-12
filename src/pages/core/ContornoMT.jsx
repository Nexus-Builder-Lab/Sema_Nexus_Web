import { useMemo } from 'react';
import useGeoJson from '../intelligence/useGeoJson.js';

const LARGURA = 300;

function aneis(geojson) {
  const geom = geojson?.geometry ?? geojson?.features?.[0]?.geometry;
  if (!geom) return [];
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}

/** Contorno de MT (malha IBGE local) como marca d'água decorativa. */
export default function ContornoMT({ className = 'nx-login-map' }) {
  const geo = useGeoJson('/geo/mt-uf.geojson');
  const desenho = useMemo(() => {
    const lista = aneis(geo);
    if (!lista.length) return null;
    const pontos = lista.flat();
    const lons = pontos.map((p) => p[0]);
    const lats = pontos.map((p) => p[1]);
    const minX = Math.min(...lons);
    const maxY = Math.max(...lats);
    const escala = LARGURA / (Math.max(...lons) - minX);
    const altura = (maxY - Math.min(...lats)) * escala;
    const d = lista
      .map(
        (anel) =>
          anel
            .map(
              ([x, y], i) =>
                `${i ? 'L' : 'M'}${((x - minX) * escala).toFixed(1)} ${((maxY - y) * escala).toFixed(1)}`,
            )
            .join('') + 'Z',
      )
      .join('');
    return { d, altura: Math.ceil(altura) };
  }, [geo]);

  if (!desenho) return null;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${LARGURA} ${desenho.altura}`}
      aria-hidden="true"
      focusable="false"
      data-testid="contorno-mt"
    >
      <path d={desenho.d} />
    </svg>
  );
}
