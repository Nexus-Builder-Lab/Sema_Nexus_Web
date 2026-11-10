import { hojeISO } from '../../utils/datas.js';

// Validação do formulário de demanda para usabilidade. Espelha `DemandaRequest` da API
// (Sema_Nexus_API); quem decide é o backend — erros 400 dele são exibidos no campo correspondente.

export const LIMITES = {
  titulo: { min: 5, max: 200 },
  descricao: { max: 4000 },
  localidade: { max: 200 },
  observacoes: { max: 2000 },
  latitude: { min: -18.1, max: -7.3 },
  longitude: { min: -61.7, max: -50.2 },
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
export function montarCorpo(valores, municipios) {
  const vazioParaNulo = (texto) => (texto.trim() === '' ? null : texto.trim());
  return {
    titulo: valores.titulo.trim(),
    descricao: valores.descricao.trim(),
    origem: valores.origem,
    categoria: valores.categoria || null,
    municipioId: encontrarMunicipio(valores.municipio, municipios)?.id ?? null,
    localidade: vazioParaNulo(valores.localidade),
    latitude: lerCoordenada(valores.latitude),
    longitude: lerCoordenada(valores.longitude),
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
