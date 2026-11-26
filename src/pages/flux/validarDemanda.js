import { hojeISO } from '../../utils/datas.js';
import { analisarGeometria, areaCompativel } from '../../utils/geometriaArea.js';

// Validação do formulário de demanda para usabilidade. Espelha `DemandaRequest` da API
// (Sema_Nexus_API); quem decide é o backend — erros 400 dele são exibidos no campo correspondente.

export const LIMITES = {
  titulo: { min: 5, max: 200 },
  descricao: { max: 4000 },
  localidade: { max: 200 },
  observacoes: { max: 2000 },
  latitude: { min: -18.1, max: -7.3 },
  longitude: { min: -61.7, max: -50.2 },
  areaHa: { min: 0.01, max: 9999999999.99 },
};

export const VALORES_INICIAIS = {
  titulo: '',
  descricao: '',
  origem: '',
  categoria: '',
  municipio: '',
  localidade: '',
  latitude: '',
  longitude: '',
  areaHa: '',
  areaGeometria: null,
  removerArea: false,
  dataRecebimento: '',
  prioridade: '',
  prazoSugerido: '',
  observacoes: '',
};

const semAcento = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** Encontra o município pelo nome digitado (sem diferenciar maiúsculas nem acentos). */
export function encontrarMunicipio(texto, municipios) {
  const alvo = semAcento(texto);
  if (!alvo) return null;
  return municipios.find((m) => semAcento(m.nome) === alvo) ?? null;
}

/** Aceita vírgula ou ponto decimal ("-15,601"); vazio → null; inválido → NaN. */
export function lerCoordenada(texto) {
  const limpo = String(texto ?? '')
    .trim()
    .replace(',', '.');
  if (limpo === '') return null;
  return /^[-+]?\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : Number.NaN;
}

function validarCoordenada(texto, { min, max }, rotulo) {
  const valor = lerCoordenada(texto);
  if (valor === null) return null;
  if (Number.isNaN(valor)) return `${rotulo} deve ser um número (ex.: -15,601).`;
  if (valor < min || valor > max) {
    return `${rotulo} deve estar entre ${String(min).replace('.', ',')} e ${String(max).replace('.', ',')}.`;
  }
  return null;
}

/** Devolve `{ campo: mensagem }` (vazio quando o formulário está válido). */
export function validarDemanda(valores, { municipios = [], hoje = hojeISO() } = {}) {
  const erros = {};

  const titulo = valores.titulo.trim();
  if (!titulo) erros.titulo = 'Informe o título.';
  else if (titulo.length < LIMITES.titulo.min || titulo.length > LIMITES.titulo.max) {
    erros.titulo = `O título deve ter entre ${LIMITES.titulo.min} e ${LIMITES.titulo.max} caracteres.`;
  }

  if (!valores.descricao.trim()) erros.descricao = 'Informe a descrição.';
  else if (valores.descricao.length > LIMITES.descricao.max) {
    erros.descricao = `A descrição deve ter no máximo ${LIMITES.descricao.max} caracteres.`;
  }

  if (!valores.origem) erros.origem = 'Selecione a origem.';

  if (!valores.municipio.trim()) erros.municipio = 'Selecione o município.';
  else if (!encontrarMunicipio(valores.municipio, municipios)) {
    erros.municipio = 'Município não encontrado entre os de Mato Grosso. Escolha um da lista.';
  }

  if (valores.localidade.length > LIMITES.localidade.max) {
    erros.localidade = `A localidade deve ter no máximo ${LIMITES.localidade.max} caracteres.`;
  }

  const erroLatitude = validarCoordenada(valores.latitude, LIMITES.latitude, 'A latitude');
  if (erroLatitude) erros.latitude = erroLatitude;
  const erroLongitude = validarCoordenada(valores.longitude, LIMITES.longitude, 'A longitude');
  if (erroLongitude) erros.longitude = erroLongitude;
  // A API exige as duas coordenadas juntas (ou nenhuma).
  const temLat = String(valores.latitude).trim() !== '';
  const temLon = String(valores.longitude).trim() !== '';
  if (temLat !== temLon) {
    const faltando = temLat ? 'longitude' : 'latitude';
    erros[faltando] ??= 'Informe latitude e longitude juntas.';
  }

  const areaHaValor = lerCoordenada(valores.areaHa);
  if (String(valores.areaHa ?? '').trim() !== '') {
    if (
      Number.isNaN(areaHaValor) ||
      areaHaValor < LIMITES.areaHa.min ||
      areaHaValor > LIMITES.areaHa.max
    ) {
      erros.areaHa = 'A área afetada deve ser um número maior que zero (mínimo 0,01 ha).';
    }
  }

  if (valores.areaGeometria) {
    const analise = analisarGeometria(valores.areaGeometria);
    if (!analise.ok) {
      erros.areaGeometria = analise.erro;
    } else if (
      areaHaValor !== null &&
      !Number.isNaN(areaHaValor) &&
      !areaCompativel(areaHaValor, analise.areaHa)
    ) {
      erros.areaHa = `A área informada diverge mais de 2% da área calculada pelo polígono (${String(analise.areaHa).replace('.', ',')} ha).`;
    }
  }

  if (!valores.dataRecebimento) erros.dataRecebimento = 'Informe a data de recebimento.';
  else if (valores.dataRecebimento > hoje) {
    erros.dataRecebimento = 'A data de recebimento não pode ser futura.';
  }

  if (
    valores.prazoSugerido &&
    valores.dataRecebimento &&
    valores.prazoSugerido < valores.dataRecebimento
  ) {
    erros.prazoSugerido = 'O prazo sugerido não pode ser anterior à data de recebimento.';
  }

  if (valores.observacoes.length > LIMITES.observacoes.max) {
    erros.observacoes = `As observações devem ter no máximo ${LIMITES.observacoes.max} caracteres.`;
  }

  return erros;
}

/** Monta o corpo de `POST/PUT /api/demandas` a partir dos valores (já validados) do formulário. */
export function montarCorpo(valores, municipios, { editando = false, areaOriginal = null } = {}) {
  const vazioParaNulo = (texto) => (texto.trim() === '' ? null : texto.trim());
  const areaHaNum = lerCoordenada(valores.areaHa);
  const areaGeometria = valores.areaGeometria ?? null;
  let areaCampos = { areaHa: areaHaNum, areaGeometria };

  if (editando) {
    if (valores.removerArea) {
      areaCampos = { areaHa: null, areaGeometria: null, removerArea: true };
    } else if (areaOriginal) {
      const tinhaGeo = Boolean(areaOriginal.areaGeometria);
      const temGeo = Boolean(areaGeometria);
      const geoIgual =
        (!tinhaGeo && !temGeo) ||
        (tinhaGeo &&
          temGeo &&
          JSON.stringify(areaOriginal.areaGeometria) === JSON.stringify(areaGeometria));
      const haOrig = areaOriginal.areaHa == null ? null : Number(areaOriginal.areaHa);
      const haIgual = haOrig === areaHaNum;
      if (geoIgual && haIgual) {
        areaCampos = { areaHa: null, areaGeometria: null, removerArea: false };
      } else if (!temGeo && areaHaNum == null && (tinhaGeo || haOrig != null)) {
        areaCampos = { areaHa: null, areaGeometria: null, removerArea: true };
      } else {
        areaCampos = { areaHa: areaHaNum, areaGeometria, removerArea: false };
      }
    } else {
      areaCampos = { areaHa: areaHaNum, areaGeometria, removerArea: false };
    }
  }

  return {
    titulo: valores.titulo.trim(),
    descricao: valores.descricao.trim(),
    origem: valores.origem,
    categoria: valores.categoria || null,
    municipioId: encontrarMunicipio(valores.municipio, municipios)?.id ?? null,
    localidade: vazioParaNulo(valores.localidade),
    latitude: lerCoordenada(valores.latitude),
    longitude: lerCoordenada(valores.longitude),
    ...areaCampos,
    dataRecebimento: valores.dataRecebimento,
    prioridade: valores.prioridade || null,
    prazoSugerido: valores.prazoSugerido || null,
    observacoes: vazioParaNulo(valores.observacoes),
  };
}

/** Preenche o formulário a partir de um `DemandaDetalhe` (edição). */
export function valoresDaDemanda(demanda) {
  const texto = (valor) => (valor == null ? '' : String(valor).replace('.', ','));
  return {
    titulo: demanda.titulo ?? '',
    descricao: demanda.descricao ?? '',
    origem: demanda.origem ?? '',
    categoria: demanda.categoria ?? '',
    municipio: demanda.municipio?.nome ?? '',
    localidade: demanda.localidade ?? '',
    latitude: texto(demanda.latitude),
    longitude: texto(demanda.longitude),
    areaHa: texto(demanda.areaHa),
    areaGeometria: demanda.areaGeometria ?? null,
    removerArea: false,
    dataRecebimento: demanda.dataRecebimento ?? '',
    prioridade: demanda.prioridade ?? '',
    prazoSugerido: demanda.prazoSugerido ?? '',
    observacoes: demanda.observacoes ?? '',
  };
}

const CAMPO_DA_API = { municipioId: 'municipio' };

/** Converte `errors: [{ campo, mensagem }]` do 400 da API em `{ campoDoFormulario: mensagem }`. */
export function errosDaApi(errors = []) {
  const saida = {};
  for (const { campo, mensagem } of errors) {
    const chave = CAMPO_DA_API[campo] ?? campo;
    if (!(chave in saida)) saida[chave] = mensagem;
  }
  return saida;
}

/**
 * Pré-preenchimento do cadastro por parâmetros da URL (atalho "Abrir demanda de monitoramento" da
 * Sentinela, GH-142, e painel de seleção do mapa, GH-147) e `location.state` (polígono GeoJSON).
 * Só preenche campos de texto/catálogo/geometria — quem salva é a pessoa.
 */
export function valoresDaUrl(params, catalogos = {}, state = null) {
  const ler = (...nomes) => {
    for (const n of nomes) {
      const v = params.get(n);
      if (v != null && v.trim() !== '') return v.trim();
    }
    return '';
  };
  const noCatalogo = (lista, codigo) => (lista ?? []).some((i) => i.codigo === codigo);
  const saida = {};
  const origem = ler('origem').toUpperCase();
  if (noCatalogo(catalogos.origens, origem)) saida.origem = origem;
  const categoria = ler('categoria').toUpperCase();
  if (noCatalogo(catalogos.categorias, categoria)) saida.categoria = categoria;
  const titulo = ler('titulo');
  if (titulo) saida.titulo = titulo.slice(0, LIMITES.titulo.max);
  const localidade = ler('localidade');
  if (localidade) saida.localidade = localidade.slice(0, LIMITES.localidade.max);
  const municipios = catalogos.municipios ?? [];
  const porId = municipios.find((m) => String(m.id) === ler('municipioId'));
  const municipio = porId ?? encontrarMunicipio(ler('municipio'), municipios);
  if (municipio) saida.municipio = municipio.nome;
  const lat = ler('latitude', 'lat');
  const lon = ler('longitude', 'lon');
  if (lat && !Number.isNaN(lerCoordenada(lat))) saida.latitude = lat;
  if (lon && !Number.isNaN(lerCoordenada(lon))) saida.longitude = lon;

  const areaHaUrl = ler('areaHa');
  const areaHaNum = lerCoordenada(areaHaUrl);
  if (
    areaHaUrl &&
    areaHaNum !== null &&
    !Number.isNaN(areaHaNum) &&
    areaHaNum >= LIMITES.areaHa.min &&
    areaHaNum <= LIMITES.areaHa.max
  ) {
    saida.areaHa = areaHaUrl;
  }

  if (state?.areaGeometria) {
    const analise = analisarGeometria(state.areaGeometria);
    if (analise.ok) {
      saida.areaGeometria = analise.geometria;
      saida.areaHa = String(analise.areaHa).replace('.', ',');
      if (!saida.latitude && !saida.longitude && analise.centroide) {
        const { latitude: cLat, longitude: cLon } = analise.centroide;
        if (
          cLat >= LIMITES.latitude.min &&
          cLat <= LIMITES.latitude.max &&
          cLon >= LIMITES.longitude.min &&
          cLon <= LIMITES.longitude.max
        ) {
          saida.latitude = String(cLat).replace('.', ',');
          saida.longitude = String(cLon).replace('.', ',');
        }
      }
    }
  }
  return saida;
}
