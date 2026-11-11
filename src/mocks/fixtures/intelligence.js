import { http, HttpResponse } from 'msw';
import { temToken, problema } from '../contrato.js';
import { CATEGORIAS, MUNICIPIOS, STATUS } from './catalogos.js';

// Indicadores fictícios dos mocks: um conjunto fixo de demandas simuladas e as mesmas agregações
// (com os mesmos filtros) que a API faz. Municípios/biomas são reais (IBGE); o resto é inventado.

export const BIOMAS = [
  { codigo: 'AMAZONIA', rotulo: 'Amazônia', ordem: 1 },
  { codigo: 'CERRADO', rotulo: 'Cerrado', ordem: 2 },
  { codigo: 'PANTANAL', rotulo: 'Pantanal', ordem: 3 },
];

const HOJE = '2026-11-10';
const AVISO = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';
const TOTAL_DOCUMENTOS = 47;

const doisDigitos = (n) => String(n).padStart(2, '0');

// Gerador determinístico (sem Math.random) para os testes serem estáveis.
function gerarDemandas() {
  const demandas = [];
  for (let i = 0; i < 72; i += 1) {
    const mes = (i % 10) + 1; // jan–out de 2026
    const dia = (i % 27) + 1;
    const municipio = MUNICIPIOS[(i * 3) % MUNICIPIOS.length];
    const status = STATUS[(i * 5) % STATUS.length].codigo;
    demandas.push({
      id: i + 1,
      municipioId: municipio.id,
      municipio: municipio.nome,
      bioma: municipio.bioma,
      categoria: CATEGORIAS[(i * 7) % CATEGORIAS.length].codigo,
      status,
      dataRecebimento: `2026-${doisDigitos(mes)}-${doisDigitos(dia)}`,
      dataFinalizacao:
        status === 'FINALIZADA' ? `2026-${doisDigitos(mes + 1)}-${doisDigitos(dia)}` : null,
      prazo: `2026-${doisDigitos(mes + 2)}-${doisDigitos(dia)}`,
    });
  }
  return demandas;
}

export const DEMANDAS_MOCK = gerarDemandas();

function filtrar(filtros = {}) {
  const { de, ate, municipioId, bioma, categoria, status } = filtros;
  return DEMANDAS_MOCK.filter(
    (d) =>
      (!de || d.dataRecebimento >= de) &&
      (!ate || d.dataRecebimento <= ate) &&
      (!municipioId || String(d.municipioId) === String(municipioId)) &&
      (!bioma || d.bioma === bioma) &&
      (!categoria || d.categoria === categoria) &&
      (!status || d.status === status),
  );
}

const contar = (lista, predicado) => lista.filter(predicado).length;

export function resumoMock(filtros) {
  const lista = filtrar(filtros);
  return {
    demonstrativo: true,
    aviso: AVISO,
    totalDemandas: lista.length,
    pendentes: contar(lista, (d) => d.status === 'PENDENTE'),
    emAndamento: contar(lista, (d) => d.status === 'EM_ANDAMENTO'),
    finalizadas: contar(lista, (d) => d.status === 'FINALIZADA'),
    atrasadas: contar(lista, (d) => d.status !== 'FINALIZADA' && d.prazo < HOJE),
    totalDocumentos: TOTAL_DOCUMENTOS,
  };
}

function porCatalogo(lista, catalogo, campo, incluirZeros) {
  return catalogo
    .map((item) => ({
      codigo: item.codigo,
      rotulo: item.rotulo,
      total: contar(lista, (d) => d[campo] === item.codigo),
    }))
    .filter((item) => incluirZeros || item.total > 0);
}

const envelope = (itens) => ({ demonstrativo: true, aviso: AVISO, itens });

export function serieMensalMock(filtros) {
  const lista = filtrar(filtros);
  const meses = new Set();
  lista.forEach((d) => {
    meses.add(d.dataRecebimento.slice(0, 7));
    if (d.dataFinalizacao) meses.add(d.dataFinalizacao.slice(0, 7));
  });
  return envelope(
    [...meses].sort().map((mes) => ({
      mes,
      cadastradas: contar(lista, (d) => d.dataRecebimento.startsWith(mes)),
      finalizadas: contar(lista, (d) => d.dataFinalizacao?.startsWith(mes)),
    })),
  );
}

export function porMunicipioMock(filtros) {
  const lista = filtrar(filtros);
  return envelope(
    MUNICIPIOS.map((m) => ({
      municipioId: m.id,
      municipio: m.nome,
      bioma: m.bioma,
      total: contar(lista, (d) => d.municipioId === m.id),
    }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total || a.municipio.localeCompare(b.municipio)),
  );
}

export const porSituacaoMock = (filtros) =>
  envelope(porCatalogo(filtrar(filtros), STATUS, 'status', true));
export const porCategoriaMock = (filtros) =>
  envelope(porCatalogo(filtrar(filtros), CATEGORIAS, 'categoria', false));
export const porBiomaMock = (filtros) =>
  envelope(porCatalogo(filtrar(filtros), BIOMAS, 'bioma', true));

const ATIVIDADES = [
  ['CONCLUSAO', 'Demanda concluída após fiscalização em campo.'],
  ['FISCALIZACAO', 'Fiscalização registrada pela equipe.'],
  ['DISTRIBUICAO', 'Demanda distribuída à Equipe Alfa (demonstração).'],
  ['TRIAGEM', 'Triagem concluída; prioridade definida.'],
  ['CADASTRO', 'Demanda cadastrada.'],
];

export function dashboardMock() {
  return {
    demonstrativo: true,
    aviso: AVISO,
    resumo: resumoMock(),
    porSituacao: porSituacaoMock().itens,
    atividadesRecentes: ATIVIDADES.map(([tipo, texto], i) => ({
      data: `2026-11-${doisDigitos(10 - i)}T09:00:00`,
      tipo,
      texto,
      demanda: {
        id: 70 - i,
        numero: `DEM-2026/${String(70 - i).padStart(4, '0')}`,
        titulo: `Demanda fictícia ${70 - i}`,
      },
      usuario: { id: 3, nome: 'Fiscal Demonstrativo 1' },
    })),
  };
}

const FILTROS = ['de', 'ate', 'municipioId', 'bioma', 'categoria', 'status'];
function filtrosDaUrl(request) {
  const params = new URL(request.url).searchParams;
  return Object.fromEntries(FILTROS.filter((f) => params.get(f)).map((f) => [f, params.get(f)]));
}

function protegido(resposta) {
  return ({ request }) =>
    temToken(request)
      ? HttpResponse.json(resposta(request))
      : problema(
          401,
          'Não autenticado',
          'Token ausente ou inválido.',
          new URL(request.url).pathname,
        );
}

export const handlersIntelligence = [
  http.get(
    '/api/dashboard',
    protegido(() => dashboardMock()),
  ),
  http.get(
    '/api/intelligence/resumo',
    protegido((r) => resumoMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/serie-mensal',
    protegido((r) => serieMensalMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-situacao',
    protegido((r) => porSituacaoMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-municipio',
    protegido((r) => porMunicipioMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-categoria',
    protegido((r) => porCategoriaMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/intelligence/por-bioma',
    protegido((r) => porBiomaMock(filtrosDaUrl(r))),
  ),
  http.get(
    '/api/catalogos/biomas',
    protegido(() => BIOMAS),
  ),
  http.get(
    '/api/catalogos/categorias',
    protegido(() => CATEGORIAS),
  ),
  http.get(
    '/api/catalogos/municipios',
    protegido((request) => {
      const bioma = new URL(request.url).searchParams.get('bioma');
      return bioma ? MUNICIPIOS.filter((m) => m.bioma === bioma) : MUNICIPIOS;
    }),
  ),
];
