import { CATEGORIAS, EQUIPES, MEMBROS, MUNICIPIOS } from './catalogos.js';
import { validarChecklistMock } from './checklists.js';
import { hojeISO } from '../../utils/datas.js';
import { analisarGeometria, areaCompativel } from '../../utils/geometriaArea.js';

// Demandas fictícias dos mocks: store em memória que simula listagem, cadastro e edição da API.
// Dados 100% simulados — nada aqui é dado oficial.

const ANO = 2026;
const HOJE = '2026-11-10';
const USUARIO_CRIADOR = { id: 1, nome: 'Administrador Demonstrativo' };

const TITULOS = [
  'Supressão de vegetação nativa em área de reserva legal',
  'Foco de queimada próximo a estrada vicinal',
  'Assoreamento de córrego em propriedade rural',
  'Captura de fauna silvestre sem autorização',
  'Pesca em período de defeso',
  'Garimpo irregular em margem de rio',
  'Descarte irregular de resíduos em área urbana',
  'Ocupação de área de preservação permanente',
];
const ORIGENS = ['DENUNCIA', 'MONITORAMENTO', 'SOLICITACAO_INSTITUCIONAL', 'ACAO_PLANEJADA'];
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'];
const STATUS = [
  'PENDENTE',
  'EM_TRIAGEM',
  'AGUARDANDO_DISTRIBUICAO',
  'DISTRIBUIDA',
  'EM_ANDAMENTO',
  'AGUARDANDO_CONCLUSAO',
  'FINALIZADA',
];

function dataRecebimento(i) {
  return `2026-10-${String((i % 28) + 1).padStart(2, '0')}`;
}

// Área afetada fictícia (polígono GeoJSON + ha) só em algumas demandas, como na massa demonstrativa da API.
const AREAS = {
  9: { ha: 42.35, lat: -15.601, lon: -56.097 },
  10: { ha: 118.6, lat: -9.876, lon: -56.086 },
};
function areaFicticia(i) {
  const a = AREAS[i];
  if (!a) return { areaHa: null, areaGeometria: null };
  const d = 0.004;
  return {
    areaHa: a.ha,
    areaGeometria: {
      type: 'Polygon',
      coordinates: [
        [
          [a.lon - d, a.lat - d],
          [a.lon + d, a.lat - d],
          [a.lon + d, a.lat + d],
          [a.lon - d, a.lat + d],
          [a.lon - d, a.lat - d],
        ],
      ],
    },
  };
}

function fixture(i) {
  const municipio = MUNICIPIOS[i % MUNICIPIOS.length];
  const status = STATUS[i % STATUS.length];
  const comPrazo = !['PENDENTE', 'EM_TRIAGEM'].includes(status);
  const equipe = comPrazo ? EQUIPES[i % EQUIPES.length] : null;
  const fiscal = equipe ? MEMBROS[equipe.id][0] : null;
  const prazo = comPrazo ? (i % 2 === 0 ? '2026-10-31' : '2026-12-20') : null;
  return {
    id: i + 1,
    numero: `DEM-${ANO}/${String(i + 1).padStart(4, '0')}`,
    titulo: `${TITULOS[i % TITULOS.length]} (${i + 1})`,
    descricao: 'Relato fictício para demonstração.',
    origem: ORIGENS[i % ORIGENS.length],
    categoria: i % 5 === 4 ? null : CATEGORIAS[i % CATEGORIAS.length].codigo,
    municipio: { id: municipio.id, nome: municipio.nome, bioma: municipio.bioma },
    localidade: 'Estrada vicinal km 12',
    latitude: null,
    longitude: null,
    ...areaFicticia(i),
    dataRecebimento: dataRecebimento(i),
    prioridade: i % 7 === 6 ? null : PRIORIDADES[i % PRIORIDADES.length],
    prazoSugerido: null,
    prazo,
    status,
    atrasada: Boolean(prazo) && prazo < HOJE && status !== 'FINALIZADA',
    equipe: equipe ? { id: equipe.id, nome: equipe.nome } : null,
    fiscal: fiscal ? { id: fiscal.id, nome: fiscal.nome } : null,
    observacoes: null,
    resultadoFinal: null,
    justificativaConclusao: null,
    concluidaEm: null,
    fiscalizacao: null,
    totalDocumentos: 0,
    criadoPor: USUARIO_CRIADOR,
    criadoEm: '2026-10-01T09:00:00',
    atualizadoEm: null,
  };
}

let demandas = [];
let proximoId = 1;
const eventos = new Map();
const fotosPorDemanda = new Map();
const conteudosFotos = new Map();
let proximoFotoId = 1;

/** Restaura as demandas fictícias iniciais (os testes chamam entre um caso e outro). */
export function resetDemandasMock(total = 25) {
  demandas = Array.from({ length: total }, (_, i) => fixture(i));
  eventos.clear();
  fotosPorDemanda.clear();
  conteudosFotos.clear();
  proximoId = total + 1;
  proximoFotoId = 1;
}
resetDemandasMock();

/** Demandas em memória (mesmo estado dos handlers do Flux); base dos indicadores do Intelligence. */
export const listarTodasDemandasMock = () => demandas;

export const buscarDemanda = (id) => demandas.find((d) => d.id === Number(id));

const resumo = (d) => ({
  id: d.id,
  numero: d.numero,
  titulo: d.titulo,
  municipio: d.municipio,
  origem: d.origem,
  categoria: d.categoria,
  prioridade: d.prioridade,
  status: d.status,
  dataRecebimento: d.dataRecebimento,
  prazo: d.prazo,
  atrasada: d.atrasada,
  equipe: d.equipe,
  fiscal: d.fiscal,
  concluidaEm: d.concluidaEm,
  atualizadoEm: d.atualizadoEm,
});

const semAcento = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CAMPOS_ORDENAVEIS = {
  numero: (d) => d.numero,
  titulo: (d) => d.titulo,
  dataRecebimento: (d) => d.dataRecebimento,
  prazo: (d) => d.prazo,
  status: (d) => d.status,
  prioridade: (d) => d.prioridade,
};

/** Listagem com os mesmos filtros, ordenação e paginação do contrato (`GET /api/demandas`). */
export function listarDemandasMock(params) {
  const q = params.get('q');
  const atrasada = params.get('atrasada');
  let lista = demandas.filter((d) => {
    if (q && !semAcento(`${d.numero} ${d.titulo}`).includes(semAcento(q))) return false;
    if (params.get('status') && d.status !== params.get('status')) return false;
    if (params.get('municipioId') && d.municipio.id !== Number(params.get('municipioId')))
      return false;
    if (params.get('categoria') && d.categoria !== params.get('categoria')) return false;
    if (params.get('prioridade') && d.prioridade !== params.get('prioridade')) return false;
    if (params.get('equipeId') && d.equipe?.id !== Number(params.get('equipeId'))) return false;
    if (params.get('fiscalId') && d.fiscal?.id !== Number(params.get('fiscalId'))) return false;
    if (atrasada && d.atrasada !== (atrasada === 'true')) return false;
    if (params.get('de') && d.dataRecebimento < params.get('de')) return false;
    if (params.get('ate') && d.dataRecebimento > params.get('ate')) return false;
    return true;
  });

  const [campo, direcao] = (params.get('sort') ?? 'numero,asc').split(',');
  const chave = CAMPOS_ORDENAVEIS[campo] ?? CAMPOS_ORDENAVEIS.numero;
  const fator = direcao === 'desc' ? -1 : 1;
  lista = [...lista].sort((a, b) => {
    const va = chave(a) ?? '';
    const vb = chave(b) ?? '';
    return fator * String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
  });

  const page = Math.max(0, Number(params.get('page') ?? 0));
  const size = Math.max(1, Number(params.get('size') ?? 20));
  return {
    content: lista.slice(page * size, page * size + size).map(resumo),
    page,
    size,
    totalElements: lista.length,
    totalPages: Math.ceil(lista.length / size),
  };
}

const LAT = [-18.1, -7.3];
const LON = [-61.7, -50.2];

/** Validações do corpo, espelhando `DemandaRequest` da API. Devolve `[{ campo, mensagem }]`. */
export function validarCorpoMock(corpo) {
  const erros = [];
  const falha = (campo, mensagem) => erros.push({ campo, mensagem });
  const titulo = typeof corpo.titulo === 'string' ? corpo.titulo.trim() : '';
  if (!titulo) falha('titulo', 'não deve estar em branco');
  else if (titulo.length < 5 || titulo.length > 200)
    falha('titulo', 'tamanho deve ser entre 5 e 200');
  if (!corpo.descricao?.trim()) falha('descricao', 'não deve estar em branco');
  else if (corpo.descricao.length > 4000) falha('descricao', 'tamanho deve ser no máximo 4000');
  if (!corpo.origem) falha('origem', 'não deve ser nulo');
  if (corpo.municipioId == null) falha('municipioId', 'não deve ser nulo');
  else if (!MUNICIPIOS.some((m) => m.id === corpo.municipioId))
    falha('municipioId', 'município não pertence a Mato Grosso');
  if (!corpo.dataRecebimento) falha('dataRecebimento', 'não deve ser nulo');
  else if (corpo.dataRecebimento > hojeISO())
    falha('dataRecebimento', 'deve ser uma data no passado ou no presente');
  if (corpo.latitude != null && (corpo.latitude < LAT[0] || corpo.latitude > LAT[1]))
    falha('latitude', 'deve estar entre -18,1 e -7,3');
  if (corpo.longitude != null && (corpo.longitude < LON[0] || corpo.longitude > LON[1]))
    falha('longitude', 'deve estar entre -61,7 e -50,2');
  if ((corpo.latitude == null) !== (corpo.longitude == null))
    falha(
      corpo.latitude == null ? 'latitude' : 'longitude',
      'Informe latitude e longitude juntas.',
    );
  if (
    corpo.prazoSugerido != null &&
    corpo.dataRecebimento &&
    corpo.prazoSugerido < corpo.dataRecebimento
  )
    falha('prazoSugerido', 'O prazo sugerido não pode ser anterior à data de recebimento.');
  if (corpo.areaHa != null) {
    const ha = Number(corpo.areaHa);
    if (!Number.isFinite(ha) || ha < 0.01 || ha > 9999999999.99)
      falha('areaHa', 'A área deve ser maior que zero.');
  }
  if (corpo.areaGeometria != null) {
    const analise = analisarGeometria(corpo.areaGeometria);
    if (!analise.ok) {
      falha('areaGeometria', analise.erro);
    } else if (
      corpo.areaHa != null &&
      Number.isFinite(Number(corpo.areaHa)) &&
      !areaCompativel(Number(corpo.areaHa), analise.areaHa)
    ) {
      falha(
        'areaHa',
        `A área informada (${corpo.areaHa} ha) diverge mais de 2% da calculada pela geometria (${analise.areaHa} ha).`,
      );
    }
  }
  if (corpo.localidade && corpo.localidade.length > 200)
    falha('localidade', 'tamanho deve ser no máximo 200');
  if (corpo.observacoes && corpo.observacoes.length > 2000)
    falha('observacoes', 'tamanho deve ser no máximo 2000');
  return erros;
}

function resolverAreaMock(destino, corpo, existente) {
  let latitude = corpo.latitude ?? null;
  let longitude = corpo.longitude ?? null;
  if (existente && corpo.areaHa == null && corpo.areaGeometria == null && !corpo.removerArea) {
    return {
      areaHa: destino.areaHa ?? null,
      areaGeometria: destino.areaGeometria ?? null,
      latitude,
      longitude,
    };
  }
  if (corpo.areaGeometria == null) {
    return { areaHa: corpo.areaHa ?? null, areaGeometria: null, latitude, longitude };
  }
  const analise = analisarGeometria(corpo.areaGeometria);
  if (!analise.ok) {
    return {
      areaHa: corpo.areaHa ?? null,
      areaGeometria: corpo.areaGeometria,
      latitude,
      longitude,
    };
  }
  if (
    latitude == null &&
    longitude == null &&
    analise.centroide &&
    analise.centroide.latitude >= LAT[0] &&
    analise.centroide.latitude <= LAT[1] &&
    analise.centroide.longitude >= LON[0] &&
    analise.centroide.longitude <= LON[1]
  ) {
    latitude = analise.centroide.latitude;
    longitude = analise.centroide.longitude;
  }
  return {
    areaHa: analise.areaHa,
    areaGeometria: analise.geometria,
    latitude,
    longitude,
  };
}

function aplicarCorpo(destino, corpo, existente = false) {
  const municipio = MUNICIPIOS.find((m) => m.id === corpo.municipioId);
  const area = resolverAreaMock(destino, corpo, existente);
  Object.assign(destino, {
    titulo: corpo.titulo.trim(),
    descricao: corpo.descricao,
    origem: corpo.origem,
    categoria: corpo.categoria ?? null,
    municipio: { id: municipio.id, nome: municipio.nome, bioma: municipio.bioma },
    localidade: corpo.localidade ?? null,
    latitude: area.latitude,
    longitude: area.longitude,
    areaHa: area.areaHa,
    areaGeometria: area.areaGeometria,
    dataRecebimento: corpo.dataRecebimento,
    prioridade: corpo.prioridade ?? null,
    prazoSugerido: corpo.prazoSugerido ?? null,
    observacoes: corpo.observacoes ?? null,
  });
  return destino;
}

export function cadastrarDemandaMock(corpo) {
  const id = proximoId++;
  const nova = aplicarCorpo(
    {
      ...fixture(0),
      id,
      numero: `DEM-${ANO}/${String(id).padStart(4, '0')}`,
      areaHa: null,
      areaGeometria: null,
      prazoSugerido: null,
      status: 'PENDENTE',
      prazo: null,
      atrasada: false,
      equipe: null,
      fiscal: null,
      criadoEm: `${HOJE}T09:00:00`,
    },
    corpo,
    false,
  );
  demandas.push(nova);
  return nova;
}

export function editarDemandaMock(demanda, corpo) {
  aplicarCorpo(demanda, corpo, true);
  demanda.atualizadoEm = `${HOJE}T10:00:00`;
  return demanda;
}

// Histórico (linha do tempo) e transições de triagem/distribuição simuladas em memória.
let proximoEvento = 1000;

/** Histórico do mais recente ao mais antigo; inclui o evento de cadastro. */
export function historicoMock(demanda) {
  const extras = eventos.get(demanda.id) ?? [];
  const cadastro = {
    id: demanda.id,
    tipo: 'CADASTRO',
    statusAnterior: null,
    statusNovo: 'PENDENTE',
    texto: null,
    usuario: demanda.criadoPor,
    data: demanda.criadoEm,
  };
  return [...extras].reverse().concat(cadastro);
}

function registrar(demanda, tipo, novoStatus, texto) {
  const evento = {
    id: proximoEvento++,
    tipo,
    statusAnterior: demanda.status,
    statusNovo: novoStatus,
    texto: texto ?? null,
    usuario: USUARIO_CRIADOR,
    data: `${HOJE}T11:00:00`,
  };
  eventos.set(demanda.id, [...(eventos.get(demanda.id) ?? []), evento]);
  demanda.status = novoStatus;
  demanda.atualizadoEm = evento.data;
}

export function iniciarTriagemMock(demanda) {
  registrar(demanda, 'TRIAGEM', 'EM_TRIAGEM');
  return demanda;
}

export function decidirTriagemMock(demanda, corpo) {
  if (corpo.decisao === 'CLASSIFICAR') {
    demanda.categoria = corpo.categoria;
    demanda.prioridade = corpo.prioridade;
    registrar(demanda, 'TRIAGEM', 'AGUARDANDO_DISTRIBUICAO', corpo.justificativa);
  } else {
    registrar(demanda, 'COMPLEMENTACAO', 'PENDENTE', corpo.justificativa);
  }
  return demanda;
}

export function validarTriagemMock(corpo) {
  const erros = [];
  if (!['CLASSIFICAR', 'SOLICITAR_COMPLEMENTACAO'].includes(corpo.decisao))
    erros.push({ campo: 'decisao', mensagem: 'decisão inválida' });
  if (corpo.decisao === 'CLASSIFICAR') {
    if (!corpo.categoria) erros.push({ campo: 'categoria', mensagem: 'não deve ser nulo' });
    if (!corpo.prioridade) erros.push({ campo: 'prioridade', mensagem: 'não deve ser nulo' });
  }
  if (!corpo.justificativa?.trim())
    erros.push({ campo: 'justificativa', mensagem: 'não deve estar em branco' });
  return erros;
}

export function validarDistribuicaoMock(corpo) {
  const erros = [];
  const equipe = EQUIPES.find((e) => e.id === corpo.equipeId);
  if (!equipe) erros.push({ campo: 'equipeId', mensagem: 'equipe inexistente' });
  const fiscal = equipe && MEMBROS[equipe.id]?.find((m) => m.id === corpo.fiscalId);
  if (!fiscal) erros.push({ campo: 'fiscalId', mensagem: 'fiscal não pertence à equipe' });
  if (!corpo.prazo) erros.push({ campo: 'prazo', mensagem: 'não deve ser nulo' });
  else if (corpo.prazo < hojeISO())
    erros.push({ campo: 'prazo', mensagem: 'deve ser uma data no presente ou no futuro' });
  return erros;
}

export function distribuirMock(demanda, corpo) {
  const equipe = EQUIPES.find((e) => e.id === corpo.equipeId);
  const fiscal = MEMBROS[equipe.id].find((m) => m.id === corpo.fiscalId);
  demanda.equipe = { id: equipe.id, nome: equipe.nome };
  demanda.fiscal = { id: fiscal.id, nome: fiscal.nome };
  demanda.prazo = corpo.prazo;
  demanda.observacoes = corpo.observacoes ?? demanda.observacoes;
  registrar(demanda, 'DISTRIBUICAO', 'DISTRIBUIDA', corpo.observacoes);
  return demanda;
}

// Execução, fiscalização, conclusão e devolução (Issue API#13).
export function iniciarExecucaoMock(demanda) {
  registrar(demanda, 'INICIO', 'EM_ANDAMENTO');
  return demanda;
}

export function validarAtividadeMock(corpo) {
  const erros = [];
  if (!corpo.descricao?.trim())
    erros.push({ campo: 'descricao', mensagem: 'não deve estar em branco' });
  if (corpo.data && corpo.data > hojeISO())
    erros.push({ campo: 'data', mensagem: 'deve ser uma data no passado ou no presente' });
  return erros;
}

export function registrarAtividadeMock(demanda, corpo) {
  registrar(demanda, 'ATIVIDADE', demanda.status, corpo.descricao);
  return eventos.get(demanda.id).at(-1);
}

export function validarFiscalizacaoMock(corpo, demanda) {
  const erros = [];
  if (!corpo.data) erros.push({ campo: 'data', mensagem: 'não deve ser nulo' });
  else if (corpo.data > hojeISO())
    erros.push({ campo: 'data', mensagem: 'deve ser uma data no passado ou no presente' });
  for (const campo of ['atividades', 'resultado', 'evidencias']) {
    if (!corpo[campo]?.trim()) erros.push({ campo, mensagem: 'não deve estar em branco' });
  }
  if (corpo.checklist != null) {
    const { erros: errosChecklist } = validarChecklistMock(demanda?.categoria, corpo.checklist);
    erros.push(...errosChecklist);
  }
  return erros;
}

export function registrarFiscalizacaoMock(demanda, corpo) {
  const anterior = demanda.fiscalizacao;
  const checklist =
    corpo.checklist != null
      ? validarChecklistMock(demanda?.categoria, corpo.checklist).normalizado
      : (anterior?.checklist ?? null);
  demanda.fiscalizacao = {
    id: demanda.id,
    data: corpo.data,
    equipe: demanda.equipe,
    atividades: corpo.atividades,
    resultado: corpo.resultado,
    evidencias: corpo.evidencias,
    recomendacoes: corpo.recomendacoes ?? null,
    registradoPor: USUARIO_CRIADOR,
    registradoEm: `${HOJE}T11:00:00`,
    checklist,
  };
  registrar(demanda, 'FISCALIZACAO', 'AGUARDANDO_CONCLUSAO', corpo.resultado);
  return demanda;
}

const MIMES_FOTO_MOCK = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function listarFotosMock(demandaId) {
  return [...(fotosPorDemanda.get(Number(demandaId)) ?? [])];
}

export async function enviarFotoMock(demanda, arquivo, autor = USUARIO_CRIADOR) {
  if (demanda.status !== 'EM_ANDAMENTO') {
    return {
      status: 409,
      erro: 'Fotos de evidência só podem ser enviadas com a demanda em andamento.',
    };
  }
  const lista = fotosPorDemanda.get(demanda.id) ?? [];
  if (lista.length >= 20) {
    return { status: 409, erro: 'A demanda já tem o máximo de 20 fotos.' };
  }
  if (!arquivo || typeof arquivo === 'string') {
    return { status: 400, erro: 'Envie a foto na parte `arquivo`.' };
  }
  if (arquivo.size === 0) {
    return { status: 400, erro: 'O arquivo está vazio.' };
  }
  if (arquivo.size > 10 * 1024 * 1024) {
    return { status: 413, erro: 'A foto excede o limite de 10 MB.' };
  }
  const ext = arquivo.name?.includes('.') ? arquivo.name.split('.').pop().toLowerCase() : '';
  const mime =
    MIMES_FOTO_MOCK[ext] ||
    (['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type) ? arquivo.type : null);
  if (!mime) {
    return { status: 415, erro: 'Formato não aceito. Envie JPEG, PNG ou WebP.' };
  }

  const nome = arquivo.name || `foto.${ext || 'jpg'}`;
  const lower = nome.toLowerCase();
  let exif = {
    exifDataHora: '2026-11-10T10:15:00',
    exifLatitude: -15.601,
    exifLongitude: -56.097,
    distanciaKm: 0.42,
    gpsForaMt: false,
    conferencia: 'CONFERE',
  };
  if (lower.includes('fora-mt')) {
    exif = {
      exifDataHora: '2026-11-10T10:15:00',
      exifLatitude: -23.5505,
      exifLongitude: -46.6333,
      distanciaKm: 1350.2,
      gpsForaMt: true,
      conferencia: 'FORA_MT',
    };
  } else if (lower.includes('divergente')) {
    exif = {
      exifDataHora: '2026-11-10T10:15:00',
      exifLatitude: -15.65,
      exifLongitude: -56.15,
      distanciaKm: 8.42,
      gpsForaMt: false,
      conferencia: 'DIVERGENTE',
    };
  } else if (lower.includes('sem-gps') || mime === 'image/png') {
    exif = {
      exifDataHora: null,
      exifLatitude: null,
      exifLongitude: null,
      distanciaKm: null,
      gpsForaMt: false,
      conferencia: 'SEM_GPS',
    };
  } else if (lower.includes('sem-ref')) {
    exif = {
      exifDataHora: '2026-11-10T10:15:00',
      exifLatitude: -15.601,
      exifLongitude: -56.097,
      distanciaKm: null,
      gpsForaMt: false,
      conferencia: 'SEM_REFERENCIA',
    };
  }

  const id = proximoFotoId++;
  const foto = {
    id,
    demandaId: demanda.id,
    nomeOriginal: nome,
    mime,
    tamanho: arquivo.size,
    sha256: `${String(id).padStart(8, '0')}a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`,
    ...exif,
    autor: { id: autor.id, nome: autor.nome },
    criadoEm: `${HOJE}T10:20:00`,
  };
  const bytes =
    typeof arquivo.arrayBuffer === 'function' ? await arquivo.arrayBuffer() : new ArrayBuffer(0);
  fotosPorDemanda.set(demanda.id, [...lista, foto]);
  conteudosFotos.set(id, new Uint8Array(bytes));
  registrar(demanda, 'ATIVIDADE', demanda.status, `[Foto] Evidência anexada: ${nome}`);
  return { status: 201, foto };
}

export function baixarFotoMock(demandaId, fotoId) {
  const lista = fotosPorDemanda.get(Number(demandaId)) ?? [];
  const foto = lista.find((f) => f.id === Number(fotoId));
  if (!foto) return null;
  return { foto, bytes: conteudosFotos.get(foto.id) ?? new Uint8Array() };
}

export function excluirFotoMock(demanda, fotoId, autor = USUARIO_CRIADOR) {
  const lista = fotosPorDemanda.get(demanda.id) ?? [];
  const foto = lista.find((f) => f.id === Number(fotoId));
  if (!foto) return { status: 404, erro: 'Foto não encontrada.' };
  if (foto.autor?.id !== autor.id) {
    return { status: 403, erro: 'Somente quem enviou a foto pode excluí-la.' };
  }
  if (demanda.status === 'FINALIZADA') {
    return {
      status: 409,
      erro: 'A demanda já foi concluída; a foto não pode mais ser excluída.',
    };
  }
  fotosPorDemanda.set(
    demanda.id,
    lista.filter((f) => f.id !== Number(fotoId)),
  );
  conteudosFotos.delete(foto.id);
  registrar(
    demanda,
    'ATIVIDADE',
    demanda.status,
    `[Foto] Evidência removida: ${foto.nomeOriginal}`,
  );
  return { status: 204 };
}

export function validarConclusaoMock(corpo) {
  const erros = [];
  if (!corpo.resultadoFinal?.trim())
    erros.push({ campo: 'resultadoFinal', mensagem: 'não deve estar em branco' });
  if (!corpo.justificativa?.trim())
    erros.push({ campo: 'justificativa', mensagem: 'não deve estar em branco' });
  return erros;
}

export function concluirMock(demanda, corpo) {
  demanda.resultadoFinal = corpo.resultadoFinal;
  demanda.justificativaConclusao = corpo.justificativa;
  demanda.concluidaEm = `${HOJE}T11:00:00`;
  demanda.atrasada = false;
  registrar(demanda, 'CONCLUSAO', 'FINALIZADA', corpo.justificativa);
  return demanda;
}

export function validarDevolucaoMock(corpo) {
  return corpo.justificativa?.trim()
    ? []
    : [{ campo: 'justificativa', mensagem: 'não deve estar em branco' }];
}

export function devolverMock(demanda, corpo) {
  registrar(demanda, 'DEVOLUCAO', 'EM_ANDAMENTO', corpo.justificativa);
  return demanda;
}
