// Catálogos fictícios dos mocks (códigos conforme o contrato OpenAPI da API).
// Municípios e biomas são referências geográficas reais (IBGE); tudo associado a eles é simulado.

const item = (codigo, rotulo, ordem) => ({ codigo, rotulo, ordem });

export const STATUS = [
  item('PENDENTE', 'Pendente', 1),
  item('EM_TRIAGEM', 'Em triagem', 2),
  item('AGUARDANDO_DISTRIBUICAO', 'Aguardando distribuição', 3),
  item('DISTRIBUIDA', 'Distribuída', 4),
  item('EM_ANDAMENTO', 'Em andamento', 5),
  item('AGUARDANDO_CONCLUSAO', 'Aguardando conclusão', 6),
  item('FINALIZADA', 'Finalizada', 7),
];

export const PRIORIDADES = [
  item('BAIXA', 'Baixa', 1),
  item('MEDIA', 'Média', 2),
  item('ALTA', 'Alta', 3),
  item('URGENTE', 'Urgente', 4),
];

export const CATEGORIAS = [
  item('DESMATAMENTO_ILEGAL', 'Desmatamento ilegal', 1),
  item('QUEIMADA_INCENDIO', 'Queimada / incêndio', 2),
  item('RECURSOS_HIDRICOS', 'Recursos hídricos', 3),
  item('FAUNA_SILVESTRE', 'Fauna silvestre', 4),
  item('PESCA_IRREGULAR', 'Pesca irregular', 5),
  item('MINERACAO_IRREGULAR', 'Mineração irregular', 6),
  item('RESIDUOS_POLUICAO', 'Resíduos e poluição', 7),
  item('AREA_PRESERVACAO_PERMANENTE', 'Área de preservação permanente', 8),
];

export const ORIGENS = [
  item('DENUNCIA', 'Denúncia', 1),
  item('MONITORAMENTO', 'Monitoramento', 2),
  item('SOLICITACAO_INSTITUCIONAL', 'Solicitação institucional', 3),
  item('ACAO_PLANEJADA', 'Ação planejada', 4),
  item('ANALISE_AMBIENTAL', 'Análise ambiental', 5),
];

const municipio = (id, nome, regiao, bioma, latitude, longitude) => ({
  id,
  nome,
  regiao,
  bioma,
  latitude,
  longitude,
});

export const MUNICIPIOS = [
  municipio(5103403, 'Cuiabá', 'Baixada Cuiabana', 'CERRADO', -15.601, -56.097),
  municipio(5107602, 'Rondonópolis', 'Sul', 'CERRADO', -16.47, -54.636),
  municipio(5108402, 'Várzea Grande', 'Baixada Cuiabana', 'CERRADO', -15.646, -56.132),
  municipio(5107909, 'Sinop', 'Norte', 'AMAZONIA', -11.864, -55.503),
  municipio(5101902, 'Barra do Garças', 'Leste', 'CERRADO', -15.89, -52.257),
  municipio(5102504, 'Cáceres', 'Sudoeste', 'PANTANAL', -16.07, -57.68),
  municipio(5103502, 'Colíder', 'Norte', 'AMAZONIA', -10.81, -55.46),
  municipio(5106505, 'Poconé', 'Pantanal', 'PANTANAL', -16.257, -56.622),
];

export const EQUIPES = [
  {
    id: 1,
    nome: 'Equipe Alfa (demonstração)',
    setorId: 2,
    setorSigla: 'DEMO-FISC',
    totalMembros: 2,
    ativo: true,
  },
  {
    id: 2,
    nome: 'Equipe Bravo (demonstração)',
    setorId: 2,
    setorSigla: 'DEMO-FISC',
    totalMembros: 1,
    ativo: true,
  },
];

const membro = (id, nome) => ({
  id,
  nome,
  email: `fiscal${id - 2}@demo.semaalerta.local`,
  perfil: 'FISCAL',
  ativo: true,
});

export const MEMBROS = {
  1: [membro(3, 'Fiscal Demonstrativo 1'), membro(4, 'Fiscal Demonstrativo 2')],
  2: [membro(5, 'Fiscal Demonstrativo 3')],
};
