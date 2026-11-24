import { useEffect, useState } from 'react';
import { detalharDemanda } from '../../api/demandasApi.js';
import { obterReferenciaPonto } from '../../api/intelligenceApi.js';

// Seleção de um item no mapa (foco de calor, alerta DETER ou demanda fictícia) e o painel de detalhes.
// A área exibida vem sempre da API: o INPE só informa área nos alertas DETER (polígono + km²); o foco de calor é
// um ponto. Áreas de demandas são fictícias (massa demonstrativa).

export const TIPOS_SELECAO = {
  FOCO_CALOR: 'Foco de calor',
  DESMATAMENTO: 'Alerta de desmatamento (DETER)',
  DEMANDA: 'Demanda de fiscalização',
};

const numero = (v, casas = 2) =>
  Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Hectares em pt-BR (`13,20 ha`); áreas positivas menores que 0,01 ha aparecem como `< 0,01 ha`. */
export function formatarHectares(ha) {
  if (ha == null || Number.isNaN(Number(ha))) return null;
  const valor = Number(ha);
  if (valor < 0.005) return '< 0,01 ha';
  return `${numero(valor)} ha`;
}

/** km² como a fonte informa (até 6 casas, sem zeros à direita). */
export function formatarKm2(km2) {
  if (km2 == null || Number.isNaN(Number(km2))) return null;
  const valor = Number(km2);
  if (valor > 0 && valor < 0.000001) return '< 0,000001 km²';
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} km²`;
}

/** Rótulos dos atributos originais do INPE (nomes da fonte → português). Desconhecidos aparecem pelo nome. */
export const ROTULOS_ATRIBUTOS = {
  id: 'Identificador do foco (INPE)',
  frp: 'FRP — potência radiativa do fogo (MW)',
  numero_dias_sem_chuva: 'Dias sem chuva',
  precipitacao: 'Precipitação (mm)',
  risco_fogo: 'Risco de fogo (0 a 1)',
  gid: 'Identificador do alerta (gid)',
  classname: 'Classe',
  quadrant: 'Quadrante',
  path_row: 'Órbita/ponto da imagem (path_row)',
  view_date: 'Data da imagem',
  created_date: 'Data de criação',
  sensor: 'Sensor',
  satellite: 'Satélite',
  areatotalkm: 'Área total (km²)',
  areamunkm: 'Área no município (km²)',
  areauckm: 'Área em unidade de conservação (km²)',
  uc: 'Unidade de conservação',
  municipality: 'Município (fonte)',
  mun_geocod: 'Código IBGE do município (fonte)',
  uf: 'UF',
  publish_month: 'Mês de publicação',
};

/** Valor de atributo para exibição: vazio → "—"; número em pt-BR (até 6 casas). */
export function formatarValor(valor) {
  if (valor == null || valor === '') return '—';
  if (typeof valor === 'number') return valor.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  return String(valor);
}

/** Limites `[[latMin, lonMin], [latMax, lonMax]]` de uma geometria GeoJSON (Polygon/MultiPolygon). */
export function limitesDaGeometria(geometria) {
  const pontos = [];
  const visitar = (c) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === 'number' && typeof c[1] === 'number') pontos.push(c);
    else c.forEach(visitar);
  };
  visitar(geometria?.coordinates);
  if (pontos.length === 0) return null;
  const lons = pontos.map((p) => p[0]);
  const lats = pontos.map((p) => p[1]);
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];
}

/** Geometria a desenhar para a seleção (o polígono do DETER ou da demanda), ou null (foco = só ponto). */
export function geometriaDaSelecao(selecao, dados) {
  if (!selecao || !dados) return null;
  return selecao.tipo === 'DEMANDA' ? (dados.areaGeometria ?? null) : (dados.geometria ?? null);
}

/**
 * Carrega o detalhe do item selecionado: `GET /api/intelligence/referencia/pontos/{id}` (INPE) ou
 * `GET /api/demandas/{id}` (a API aplica a permissão do perfil: 403 para fiscal fora do escopo).
 */
export function useDetalheSelecao(selecao, tentativa = 0) {
  const chave = selecao ? `${selecao.tipo}:${selecao.id}:${tentativa}` : null;
  const [resp, setResp] = useState({ chave: null, erro: null, dados: null });
  useEffect(() => {
    if (!selecao) return undefined;
    let vivo = true;
    const buscar =
      selecao.tipo === 'DEMANDA'
        ? () => detalharDemanda(selecao.id)
        : () => obterReferenciaPonto(selecao.id);
    buscar()
      .then((dados) => vivo && setResp({ chave, erro: null, dados }))
      .catch((erro) => vivo && setResp({ chave, erro, dados: null }));
    return () => {
      vivo = false;
    };
    // a chave identifica a seleção e a tentativa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  const atual = chave !== null && resp.chave === chave;
  return {
    carregando: Boolean(selecao) && !atual,
    erro: atual ? resp.erro : null,
    dados: atual ? resp.dados : null,
  };
}
