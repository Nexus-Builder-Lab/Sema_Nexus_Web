import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// Malha local (public/geo) não existe no jsdom: geometria mínima só para os testes.
const malhaDeTeste = http.get('/geo/mt-uf.geojson', () =>
  HttpResponse.json({ type: 'Feature', properties: { uf: 'MT' }, geometry: null }),
);

const municipiosDeTeste = http.get('/geo/mt-municipios.geojson', () =>
  HttpResponse.json({ type: 'FeatureCollection', features: [] }),
);

// Usado pelos testes (Vitest, ambiente jsdom).
export const server = setupServer(...handlers, malhaDeTeste, municipiosDeTeste);
