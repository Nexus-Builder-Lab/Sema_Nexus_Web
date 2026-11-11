import httpClient from './httpClient.js';

/** GET /api/catalogos/municipios → `[{ id, nome, regiao, bioma, latitude, longitude }]`. */
export async function listarMunicipios() {
  const { data } = await httpClient.get('/catalogos/municipios');
  return data;
}

/** GET /api/catalogos/categorias → `[{ codigo, rotulo, ordem }]`. */
export async function listarCategorias() {
  const { data } = await httpClient.get('/catalogos/categorias');
  return data;
}

/** GET /api/catalogos/biomas → `[{ codigo, rotulo, ordem }]`. */
export async function listarBiomas() {
  const { data } = await httpClient.get('/catalogos/biomas');
  return data;
}
