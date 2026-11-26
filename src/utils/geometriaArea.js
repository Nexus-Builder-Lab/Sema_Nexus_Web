// Validação, cálculo de área (Chamberlain-Duquette) e centroide de polígonos GeoJSON (WGS84),
// espelhando `GeometriaArea` e `Geodesia` da API (Sema_Nexus_API) para feedback imediato na interface.

export const RAIO_TERRA_KM = 6371.0088;
export const M2_POR_HA = 10_000;
export const MAX_VERTICES = 2000;
export const MAX_BYTES = 200 * 1024;
export const TOLERANCIA_AREA = 0.02;

export const LIMITES_GEO_MT = {
  latMin: -18.1,
  latMax: -7.3,
  lonMin: -61.7,
  lonMax: -50.1,
};

const arredondar = (valor, casas) => {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
};

const rad = (graus) => (graus * Math.PI) / 180;

/** Verifica se um par `(lat, lon)` é finito e está dentro da caixa de Mato Grosso. */
export function dentroDeMt(lat, lon) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= LIMITES_GEO_MT.latMin &&
    lat <= LIMITES_GEO_MT.latMax &&
    lon >= LIMITES_GEO_MT.lonMin &&
    lon <= LIMITES_GEO_MT.lonMax
  );
}

function areaAnelM2(anel) {
  let soma = 0;
  for (let i = 0; i + 1 < anel.length; i++) {
    const p1 = anel[i];
    const p2 = anel[i + 1];
    soma += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1])));
  }
  const r = RAIO_TERRA_KM * 1000;
  return (Math.abs(soma) * r * r) / 2;
}

function lerPoligono(aneis, contador) {
  if (!Array.isArray(aneis) || aneis.length === 0) {
    throw new Error('Polígono sem anéis.');
  }
  const saida = [];
  for (const anel of aneis) {
    if (!Array.isArray(anel) || anel.length < 4) {
      throw new Error('Cada anel precisa de ao menos 4 pontos (fechado).');
    }
    const pontos = [];
    for (const p of anel) {
      if (
        !Array.isArray(p) ||
        p.length < 2 ||
        typeof p[0] !== 'number' ||
        typeof p[1] !== 'number'
      ) {
        throw new Error('Coordenada inválida (esperado [lon, lat]).');
      }
      const [lon, lat] = p;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        throw new Error('Coordenada não numérica (NaN/infinito).');
      }
      if (!dentroDeMt(lat, lon)) {
        throw new Error('Há vértice fora de Mato Grosso (lat -18,1 a -7,3; lon -61,7 a -50,1).');
      }
      contador.total += 1;
      if (contador.total > MAX_VERTICES) {
        throw new Error(`A geometria excede ${MAX_VERTICES} vértices.`);
      }
      pontos.push([lon, lat]);
    }
    const primeiro = pontos[0];
    const ultimo = pontos[pontos.length - 1];
    if (primeiro[0] !== ultimo[0] || primeiro[1] !== ultimo[1]) {
      throw new Error('Anel não fechado (primeiro e último ponto devem coincidir).');
    }
    saida.push(pontos);
  }
  return saida;
}

function calcularCentroide(poligonos) {
  let lat = 0;
  let lon = 0;
  let n = 0;
  for (const aneis of poligonos) {
    const exterior = aneis[0];
    if (!exterior?.length) continue;
    const primeiro = exterior[0];
    const ultimo = exterior[exterior.length - 1];
    const fim =
      exterior.length > 1 && primeiro[0] === ultimo[0] && primeiro[1] === ultimo[1]
        ? exterior.length - 1
        : exterior.length;
    for (let i = 0; i < fim; i++) {
      lon += exterior[i][0];
      lat += exterior[i][1];
      n += 1;
    }
  }
  if (n === 0) return null;
  return { latitude: arredondar(lat / n, 6), longitude: arredondar(lon / n, 6) };
}

/** Valida geometria GeoJSON (`Polygon` ou `MultiPolygon`) e calcula `areaHa`, `centroide` e `vertices`. */
export function analisarGeometria(geometria) {
  if (!geometria || typeof geometria !== 'object') {
    return { ok: false, erro: 'Geometria ausente.' };
  }
  let texto;
  try {
    texto = JSON.stringify(geometria);
  } catch {
    return { ok: false, erro: 'Geometria não é um JSON válido.' };
  }
  const bytes = new TextEncoder().encode(texto).length;
  if (bytes > MAX_BYTES) {
    return { ok: false, erro: `Geometria excede ${MAX_BYTES / 1024} KB.` };
  }
  const { type, coordinates } = geometria;
  if (type !== 'Polygon' && type !== 'MultiPolygon') {
    return { ok: false, erro: 'A geometria deve ser Polygon ou MultiPolygon (GeoJSON).' };
  }
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { ok: false, erro: 'A geometria não tem coordenadas.' };
  }

  const poligonos = [];
  const contador = { total: 0 };
  try {
    if (type === 'Polygon') {
      poligonos.push(lerPoligono(coordinates, contador));
    } else {
      for (const p of coordinates) {
        if (!Array.isArray(p) || p.length === 0) {
          throw new Error('Polígono vazio no MultiPolygon.');
        }
        poligonos.push(lerPoligono(p, contador));
      }
    }
  } catch (e) {
    return { ok: false, erro: e.message };
  }

  let m2 = 0;
  for (const aneis of poligonos) {
    for (let i = 0; i < aneis.length; i++) {
      const a = areaAnelM2(aneis[i]);
      m2 += i === 0 ? a : -a;
    }
  }
  const areaHa = arredondar(m2 / M2_POR_HA, 2);
  if (m2 <= 0 || areaHa <= 0) {
    return { ok: false, erro: 'A área calculada da geometria é nula (mínimo 0,01 ha).' };
  }

  const normalizada =
    type === 'Polygon'
      ? { type: 'Polygon', coordinates: poligonos[0] }
      : { type: 'MultiPolygon', coordinates: poligonos };

  return {
    ok: true,
    geometria: normalizada,
    areaHa,
    centroide: calcularCentroide(poligonos),
    vertices: contador.total,
  };
}

/** Verifica compatibilidade entre a área informada e a calculada (tolerância de 2% ou 0,01 ha). */
export function areaCompativel(informada, calculada) {
  if (!Number.isFinite(informada) || !Number.isFinite(calculada)) return false;
  return Math.abs(informada - calculada) <= Math.max(0.01, calculada * TOLERANCIA_AREA);
}

/** Converte lista de pontos `[[lat, lon], ...]` (mínimo 3) em `Polygon` fechado e analisa. */
export function fecharPoligonoPontos(pontosLatLng = []) {
  if (pontosLatLng.length < 3) {
    return { ok: false, erro: 'Desenhe pelo menos 3 vértices para fechar o polígono.' };
  }
  const anel = pontosLatLng.map(([lat, lon]) => [arredondar(lon, 6), arredondar(lat, 6)]);
  anel.push([...anel[0]]);
  return analisarGeometria({ type: 'Polygon', coordinates: [anel] });
}

function normalizarCoordenadas2D(geometria) {
  if (!geometria || typeof geometria !== 'object') return null;
  const limparAnel = (anel) =>
    Array.isArray(anel)
      ? anel.map((p) => (Array.isArray(p) && p.length >= 2 ? [p[0], p[1]] : p))
      : anel;
  if (geometria.type === 'Polygon' && Array.isArray(geometria.coordinates)) {
    return { type: 'Polygon', coordinates: geometria.coordinates.map(limparAnel) };
  }
  if (geometria.type === 'MultiPolygon' && Array.isArray(geometria.coordinates)) {
    return {
      type: 'MultiPolygon',
      coordinates: geometria.coordinates.map((p) => (Array.isArray(p) ? p.map(limparAnel) : p)),
    };
  }
  return geometria;
}

/** Extrai e valida a geometria (`Polygon`/`MultiPolygon`) de um texto GeoJSON (`Geometry`, `Feature` ou `FeatureCollection`). */
export function extrairGeometriaGeoJson(texto) {
  let obj;
  try {
    obj = JSON.parse(String(texto ?? ''));
  } catch {
    return { ok: false, erro: 'Arquivo GeoJSON inválido (JSON malformado).' };
  }
  if (!obj || typeof obj !== 'object') {
    return { ok: false, erro: 'Conteúdo GeoJSON inválido.' };
  }

  let geometria = null;
  if (obj.type === 'Polygon' || obj.type === 'MultiPolygon') {
    geometria = normalizarCoordenadas2D(obj);
  } else if (obj.type === 'Feature') {
    if (!obj.geometry) {
      return { ok: false, erro: 'A Feature GeoJSON não possui geometria.' };
    }
    geometria = normalizarCoordenadas2D(obj.geometry);
  } else if (obj.type === 'FeatureCollection') {
    const features = Array.isArray(obj.features) ? obj.features : [];
    const poligonos = features
      .map((f) => normalizarCoordenadas2D(f?.geometry))
      .filter((g) => g && (g.type === 'Polygon' || g.type === 'MultiPolygon'));
    if (poligonos.length === 0) {
      return { ok: false, erro: 'O GeoJSON não contém geometria Polygon ou MultiPolygon.' };
    }
    if (poligonos.length === 1) {
      geometria = poligonos[0];
    } else {
      const todos = [];
      for (const g of poligonos) {
        if (g.type === 'Polygon') todos.push(g.coordinates);
        else todos.push(...g.coordinates);
      }
      geometria = { type: 'MultiPolygon', coordinates: todos };
    }
  } else {
    return {
      ok: false,
      erro: 'Tipo GeoJSON não suportado. Use Polygon, MultiPolygon, Feature ou FeatureCollection.',
    };
  }

  return analisarGeometria(geometria);
}

/** Conta o total de vértices de um `Polygon`/`MultiPolygon`. */
export function contarVertices(geometria) {
  if (!geometria?.coordinates) return 0;
  let total = 0;
  const poligonos = geometria.type === 'Polygon' ? [geometria.coordinates] : geometria.coordinates;
  for (const aneis of poligonos) {
    if (!Array.isArray(aneis)) continue;
    for (const anel of aneis) {
      if (Array.isArray(anel)) total += anel.length;
    }
  }
  return total;
}
