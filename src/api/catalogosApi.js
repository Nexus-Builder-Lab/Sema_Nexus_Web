import httpClient from './httpClient.js';

async function obter(caminho) {
  const { data } = await httpClient.get(caminho);
  return data;
}

/** Catálogos (qualquer perfil autenticado): `[{ codigo, rotulo, ordem }]`. */
export const listarStatus = () => obter('/catalogos/status');
export const listarPrioridades = () => obter('/catalogos/prioridades');
export const listarCategorias = () => obter('/catalogos/categorias');
export const listarOrigens = () => obter('/catalogos/origens');

/** Municípios de MT: `[{ id (IBGE), nome, regiao, bioma, latitude, longitude }]`. */
export const listarMunicipios = () => obter('/catalogos/municipios');

/** Equipes e membros: somente ADMIN e GESTOR (os demais perfis recebem 403). */
export const listarEquipes = () => obter('/equipes');
export const listarMembros = (equipeId) => obter(`/equipes/${equipeId}/membros`);
