// Modelos de checklist estruturado por categoria de fiscalização (espelho de ChecklistFiscalizacao.java).
// Itens fictícios/demonstrativos para os mocks MSW; a fonte de verdade é GET /api/demandas/checklists.

const bool = (id, rotulo, obrigatorio) => ({ id, rotulo, tipo: 'BOOLEANO', obrigatorio });
const texto = (id, rotulo, obrigatorio) => ({ id, rotulo, tipo: 'TEXTO', obrigatorio });
const numero = (id, rotulo, obrigatorio) => ({ id, rotulo, tipo: 'NUMERO', obrigatorio });

const ACESSIVEL = bool('local_acessivel', 'O local estava acessível para a vistoria?', true);
const OBS = texto('observacoes_checklist', 'Observações do checklist', false);

export const CHECKLISTS_MOCK = [
  {
    categoria: 'DESMATAMENTO_ILEGAL',
    rotulo: 'Desmatamento ilegal',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('supressao_confirmada', 'A supressão de vegetação foi confirmada?', true),
      numero('area_estimada_ha', 'Área suprimida estimada (ha)', true),
      bool('vegetacao_nativa', 'A vegetação suprimida era nativa?', false),
      bool('maquinario_no_local', 'Havia maquinário no local?', true),
      OBS,
    ],
  },
  {
    categoria: 'QUEIMADA_INCENDIO',
    rotulo: 'Queimada / incêndio',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('foco_ativo', 'Havia foco ativo no momento da vistoria?', true),
      numero('area_atingida_ha', 'Área atingida estimada (ha)', true),
      bool('origem_identificada', 'A origem do fogo foi identificada?', false),
      OBS,
    ],
  },
  {
    categoria: 'RECURSOS_HIDRICOS',
    rotulo: 'Recursos hídricos',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('captacao_irregular', 'Há captação de água sem outorga aparente?', true),
      bool('lancamento_efluente', 'Há lançamento de efluente no corpo hídrico?', true),
      texto('corpo_hidrico', 'Corpo hídrico afetado', true),
      OBS,
    ],
  },
  {
    categoria: 'FAUNA_SILVESTRE',
    rotulo: 'Fauna silvestre',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('animais_encontrados', 'Foram encontrados animais silvestres?', true),
      numero('quantidade_animais', 'Quantidade de animais', false),
      texto('especies_observadas', 'Espécies observadas', false),
      OBS,
    ],
  },
  {
    categoria: 'PESCA_IRREGULAR',
    rotulo: 'Pesca irregular',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('petrechos_proibidos', 'Havia petrechos proibidos?', true),
      bool('periodo_defeso', 'A atividade ocorreu no período de defeso?', true),
      numero('pescado_kg', 'Pescado encontrado (kg)', false),
      OBS,
    ],
  },
  {
    categoria: 'MINERACAO_IRREGULAR',
    rotulo: 'Mineração irregular',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('atividade_em_operacao', 'A atividade estava em operação?', true),
      numero('area_degradada_ha', 'Área degradada estimada (ha)', true),
      bool('indicio_mercurio', 'Há indício de uso de mercúrio?', false),
      OBS,
    ],
  },
  {
    categoria: 'RESIDUOS_POLUICAO',
    rotulo: 'Resíduos e poluição',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('residuos_expostos', 'Havia resíduos expostos?', true),
      texto('tipo_residuo', 'Tipo de resíduo', true),
      numero('volume_estimado_m3', 'Volume estimado (m³)', false),
      OBS,
    ],
  },
  {
    categoria: 'AREA_PRESERVACAO_PERMANENTE',
    rotulo: 'Área de preservação permanente',
    versao: 1,
    itens: [
      ACESSIVEL,
      bool('intervencao_app', 'Houve intervenção na APP?', true),
      numero('faixa_afetada_m', 'Largura da faixa afetada (m)', false),
      bool('edificacao_no_local', 'Há edificação no local?', false),
      OBS,
    ],
  },
];

export function modeloChecklistPorCategoria(categoria) {
  return CHECKLISTS_MOCK.find((m) => m.categoria === categoria) ?? null;
}

export function validarChecklistMock(categoria, respostas) {
  if (respostas == null) return { erros: [], normalizado: null };
  if (typeof respostas !== 'object' || Array.isArray(respostas)) {
    return {
      erros: [{ campo: 'checklist', mensagem: 'Checklist deve ser um objeto.' }],
      normalizado: null,
    };
  }
  const modelo = modeloChecklistPorCategoria(categoria);
  if (!modelo) {
    return {
      erros: [
        { campo: 'checklist', mensagem: 'A demanda não tem categoria para validar o checklist.' },
      ],
      normalizado: null,
    };
  }
  const porId = new Map(modelo.itens.map((item) => [item.id, item]));
  const erros = [];
  for (const chave of Object.keys(respostas)) {
    if (!porId.has(chave)) {
      erros.push({
        campo: `checklist.${chave}`,
        mensagem: `Item desconhecido para a categoria ${modelo.rotulo}.`,
      });
    }
  }
  const normalizado = {};
  for (const item of modelo.itens) {
    let valor = respostas[item.id];
    if (typeof valor === 'string' && !valor.trim()) valor = null;
    if (valor == null) {
      if (item.obrigatorio) {
        erros.push({
          campo: `checklist.${item.id}`,
          mensagem: `Item obrigatório: ${item.rotulo}`,
        });
      }
      continue;
    }
    if (item.tipo === 'BOOLEANO') {
      if (typeof valor !== 'boolean') {
        erros.push({ campo: `checklist.${item.id}`, mensagem: 'Responda verdadeiro ou falso.' });
      } else {
        normalizado[item.id] = valor;
      }
    } else if (item.tipo === 'TEXTO') {
      if (typeof valor !== 'string' || valor.trim().length > 500) {
        erros.push({
          campo: `checklist.${item.id}`,
          mensagem: 'Informe um texto de até 500 caracteres.',
        });
      } else {
        normalizado[item.id] = valor.trim();
      }
    } else if (item.tipo === 'NUMERO') {
      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 1e9) {
        erros.push({
          campo: `checklist.${item.id}`,
          mensagem: 'Informe um número entre 0 e 1000000000.',
        });
      } else {
        normalizado[item.id] = valor;
      }
    }
  }
  return {
    erros,
    normalizado: erros.length
      ? null
      : { versao: modelo.versao, categoria: modelo.categoria, itens: normalizado },
  };
}
