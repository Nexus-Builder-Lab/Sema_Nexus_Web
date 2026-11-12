// Menu principal. As rotas seguem as Issues de cada módulo; telas ainda não
// implementadas caem na página "não encontrada" dentro do layout.
export const NAVIGATION = [
  {
    group: 'Core',
    items: [{ to: '/', label: 'Início', icon: 'home', end: true }],
  },
  {
    group: 'Intelligence',
    items: [
      { to: '/intelligence', label: 'Dashboard ambiental', icon: 'dashboard', end: true },
      {
        to: '/intelligence/inteligencia-ambiental',
        label: 'Inteligência ambiental',
        icon: 'map',
      },
      { to: '/intelligence/indicadores', label: 'Indicadores', icon: 'dashboard' },
    ],
  },
  {
    group: 'Flux',
    items: [
      { to: '/flux/demandas', label: 'Demandas', icon: 'clipboard' },
      { to: '/flux/painel', label: 'Painel de fiscalização', icon: 'dashboard' },
    ],
  },
  {
    group: 'DocIA',
    items: [
      { to: '/docia/documentos', label: 'Documentos', icon: 'file' },
      { to: '/docia/assistente', label: 'Assistente', icon: 'inbox' },
      { to: '/docia/comparacao', label: 'Comparação', icon: 'file' },
    ],
  },
  {
    group: 'Administração',
    items: [
      { to: '/admin/usuarios', label: 'Usuários', icon: 'users' },
      { to: '/admin/equipes', label: 'Equipes', icon: 'team' },
    ],
  },
];

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
