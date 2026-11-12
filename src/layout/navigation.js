// Menu principal. As rotas seguem as Issues de cada módulo; telas ainda não
// implementadas caem na página "não encontrada" dentro do layout.
export const NAVIGATION = [
  {
    group: 'Visão geral',
    items: [{ to: '/', label: 'Início', icon: 'dashboard', end: true }],
  },
  {
    group: 'SEMA Intelligence',
    subtitle: 'Gestão e análise ambiental',
    items: [
      { to: '/intelligence', label: 'Dashboard ambiental', icon: 'layers', end: true },
      {
        to: '/intelligence/inteligencia-ambiental',
        label: 'Inteligência ambiental',
        icon: 'map',
      },
      { to: '/intelligence/indicadores', label: 'Análise de indicadores', icon: 'indicators' },
      {
        to: '/intelligence/relatorios',
        label: 'Relatórios gerenciais',
        icon: 'report',
        roles: ['ADMIN', 'GESTOR', 'ANALISTA', 'CONSULTA'],
      },
    ],
  },
  {
    group: 'SEMA Flux',
    subtitle: 'Processos e demandas',
    items: [
      { to: '/flux/demandas', label: 'Demandas', icon: 'clipboard' },
      { to: '/flux/painel', label: 'Painel de fiscalização', icon: 'indicators' },
    ],
  },
  {
    group: 'SEMA DocIA',
    subtitle: 'Documentos e processos',
    items: [
      { to: '/docia/documentos', label: 'Documentos', icon: 'folder' },
      { to: '/docia/assistente', label: 'Assistente DocIA', icon: 'assistant' },
      { to: '/docia/comparacao', label: 'Comparação', icon: 'compare' },
    ],
  },
  {
    group: 'Administração',
    items: [
      { to: '/admin/usuarios', label: 'Usuários', icon: 'users', roles: ['ADMIN'] },
      { to: '/admin/estrutura', label: 'Setores e equipes', icon: 'team', roles: ['ADMIN'] },
      { to: '/admin/auditoria', label: 'Auditoria', icon: 'audit', roles: ['ADMIN'] },
    ],
  },
];

/** Módulo (eyebrow do cabeçalho de página) → rótulo e ícone, como no protótipo. */
export const MODULES = {
  core: { label: 'SEMA NEXUS', icon: 'leaf' },
  intelligence: { label: 'SEMA Intelligence', icon: 'layers' },
  flux: { label: 'SEMA Flux', icon: 'clipboard' },
  docia: { label: 'SEMA DocIA', icon: 'folder' },
};

/** Localiza o item do menu que corresponde ao caminho (prefixo mais longo). */
export function findNavItem(pathname) {
  let best = null;
  for (const { group, items } of NAVIGATION) {
    for (const item of items) {
      const matches = item.end
        ? pathname === item.to
        : pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (matches && (!best || item.to.length > best.item.to.length)) best = { group, item };
    }
  }
  return best;
}

/** Rótulo do trecho final de rotas aninhadas (nova, detalhes, edição). */
export function subCrumb(base, pathname) {
  const rest = pathname.slice(base.length).split('/').filter(Boolean);
  if (rest.length === 0) return null;
  if (rest[0] === 'nova') return 'Nova demanda';
  if (rest[0] === 'novo') return 'Novo documento';
  if (rest[1] === 'editar') return 'Editar';
  return 'Detalhes';
}
