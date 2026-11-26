import {
  analisarGeometria,
  areaCompativel,
  contarVertices,
  dentroDeMt,
  extrairGeometriaGeoJson,
  fecharPoligonoPontos,
} from './geometriaArea.js';

const POLIGONO_VALIDO = {
  type: 'Polygon',
  coordinates: [
    [
      [-56.1, -15.6],
      [-56.09, -15.6],
      [-56.09, -15.59],
      [-56.1, -15.59],
      [-56.1, -15.6],
    ],
  ],
};

describe('geometriaArea', () => {
  it('valida limites de MT e analisa polígono calculando área em ha e centroide', () => {
    expect(dentroDeMt(-15.6, -56.1)).toBe(true);
    expect(dentroDeMt(-5, -56.1)).toBe(false);
    expect(dentroDeMt(-15.6, -49.5)).toBe(false);

    const res = analisarGeometria(POLIGONO_VALIDO);
    expect(res.ok).toBe(true);
    expect(res.areaHa).toBeGreaterThan(100);
    expect(res.areaHa).toBeLessThan(150);
    expect(res.centroide.latitude).toBeCloseTo(-15.595, 3);
    expect(res.centroide.longitude).toBeCloseTo(-56.095, 3);
    expect(res.vertices).toBe(5);
    expect(contarVertices(res.geometria)).toBe(5);
  });

  it('subtrai furos (anéis interiores) e aceita MultiPolygon', () => {
    const comFuro = {
      type: 'Polygon',
      coordinates: [
        POLIGONO_VALIDO.coordinates[0],
        [
          [-56.098, -15.598],
          [-56.092, -15.598],
          [-56.092, -15.592],
          [-56.098, -15.592],
          [-56.098, -15.598],
        ],
      ],
    };
    const semFuro = analisarGeometria(POLIGONO_VALIDO);
    const analisado = analisarGeometria(comFuro);
    expect(analisado.ok).toBe(true);
    expect(analisado.areaHa).toBeLessThan(semFuro.areaHa);

    const multi = analisarGeometria({
      type: 'MultiPolygon',
      coordinates: [POLIGONO_VALIDO.coordinates],
    });
    expect(multi.ok).toBe(true);
    expect(multi.areaHa).toBe(semFuro.areaHa);
  });

  it('rejeita anel aberto, fora de MT, vértices insuficientes ou área nula', () => {
    expect(
      analisarGeometria({
        type: 'Polygon',
        coordinates: [
          [
            [-56.1, -15.6],
            [-56.09, -15.6],
            [-56.09, -15.59],
            [-56.1, -15.59],
          ],
        ],
      }),
    ).toMatchObject({ ok: false, erro: expect.stringMatching(/fechado/) });

    expect(
      analisarGeometria({
        type: 'Polygon',
        coordinates: [
          [
            [-48, -15.6],
            [-47.9, -15.6],
            [-47.9, -15.5],
            [-48, -15.6],
          ],
        ],
      }),
    ).toMatchObject({ ok: false, erro: expect.stringMatching(/Mato Grosso/) });

    expect(
      fecharPoligonoPontos([
        [-15.6, -56.1],
        [-15.6, -56.09],
      ]).ok,
    ).toBe(false);
    expect(
      fecharPoligonoPontos([
        [-15.6, -56.1],
        [-15.6, -56.1],
        [-15.6, -56.1],
      ]).ok,
    ).toBe(false);
  });

  it('fecha polígono desenhado com >= 3 pontos e verifica compatibilidade de área (2%)', () => {
    const res = fecharPoligonoPontos([
      [-15.6, -56.1],
      [-15.6, -56.09],
      [-15.59, -56.09],
      [-15.59, -56.1],
    ]);
    expect(res.ok).toBe(true);
    expect(res.geometria.type).toBe('Polygon');
    expect(res.geometria.coordinates[0]).toHaveLength(5);
    expect(areaCompativel(res.areaHa, res.areaHa)).toBe(true);
    expect(areaCompativel(res.areaHa * 1.05, res.areaHa)).toBe(false);
  });

  it('importa GeoJSON de Polygon, Feature e FeatureCollection (descartando 3ª coordenada)', () => {
    const fc = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { nome: 'Área A' },
          geometry: {
            type: 'Polygon',
            coordinates: [POLIGONO_VALIDO.coordinates[0].map(([lon, lat]) => [lon, lat, 250])],
          },
        },
      ],
    });
    const res = extrairGeometriaGeoJson(fc);
    expect(res.ok).toBe(true);
    expect(res.geometria.coordinates[0][0]).toEqual([-56.1, -15.6]);

    expect(extrairGeometriaGeoJson('{invalido').ok).toBe(false);
    expect(
      extrairGeometriaGeoJson(JSON.stringify({ type: 'Point', coordinates: [-56.1, -15.6] })).ok,
    ).toBe(false);
  });
});
