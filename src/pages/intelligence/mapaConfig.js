// Configuração visual do mapa: cor por categoria (códigos do contrato da API).
export const CORES_CATEGORIA = {
  DESMATAMENTO_ILEGAL: '#b42318',
  QUEIMADA_INCENDIO: '#e8590c',
  RECURSOS_HIDRICOS: '#1971c2',
  FAUNA_SILVESTRE: '#7b4a12',
  PESCA_IRREGULAR: '#0c8599',
  MINERACAO_IRREGULAR: '#6f42c1',
  RESIDUOS_POLUICAO: '#495057',
  AREA_PRESERVACAO_PERMANENTE: '#2b8a3e',
};
export const COR_SEM_CATEGORIA = '#868e96';

export const ROTULOS_CATEGORIA = {
  DESMATAMENTO_ILEGAL: 'Desmatamento ilegal',
  QUEIMADA_INCENDIO: 'Queimada / incêndio',
  RECURSOS_HIDRICOS: 'Recursos hídricos',
  FAUNA_SILVESTRE: 'Fauna silvestre',
  PESCA_IRREGULAR: 'Pesca irregular',
  MINERACAO_IRREGULAR: 'Mineração irregular',
  RESIDUOS_POLUICAO: 'Resíduos e poluição',
  AREA_PRESERVACAO_PERMANENTE: 'Área de preservação permanente',
};

export const ROTULOS_STATUS = {
  PENDENTE: 'Pendente',
  EM_TRIAGEM: 'Em triagem',
  AGUARDANDO_DISTRIBUICAO: 'Aguardando distribuição',
  DISTRIBUIDA: 'Distribuída',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CONCLUSAO: 'Aguardando conclusão',
  FINALIZADA: 'Finalizada',
};

export const corDaCategoria = (codigo) => CORES_CATEGORIA[codigo] ?? COR_SEM_CATEGORIA;
export const rotuloDaCategoria = (codigo) =>
  codigo ? (ROTULOS_CATEGORIA[codigo] ?? codigo) : 'Sem categoria';

export const FONTE_MALHA = 'Malha territorial: IBGE (API de Malhas v3, municípios de MT).';
export const CENTRO_MT = [-12.9, -55.9];
export const ZOOM_MT = 6;

export const FILTROS_VAZIOS = { municipioId: '', bioma: '', categoria: '', de: '', ate: '' };
