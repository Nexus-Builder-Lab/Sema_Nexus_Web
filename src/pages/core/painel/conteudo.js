// Conteúdo descritivo do Painel do sistema (Web#123). O estado ao vivo vem de GET /api/sistema/painel.

/** Módulos do sistema: o que fazem e onde estão. */
export const MODULOS = [
  {
    id: 'core',
    nome: 'Core',
    icone: 'leaf',
    cor: 'green',
    resumo: 'Base comum: acesso, perfis, estrutura organizacional, notificações e auditoria.',
    funcionalidades: [
      'Login com JWT e perfis (Administrador, Gestor, Fiscal, Analista, Consulta)',
      'Usuários, setores, equipes e núcleos regionais',
      'Notificações de prazos e eventos',
      'Auditoria de todas as ações (inclusive dos agentes de IA)',
      'Busca global e painel inicial',
    ],
    rotas: [{ rotulo: 'Início', to: '/' }],
  },
  {
    id: 'intelligence',
    nome: 'SEMA Intelligence',
    icone: 'layers',
    cor: 'blue',
    resumo: 'Inteligência ambiental: indicadores, mapa de Mato Grosso e dados públicos do INPE.',
    funcionalidades: [
      'Painel ambiental com indicadores e séries mensais',
      'Mapa de MT (offline) com demandas, concentração por município e filtros',
      'Camada de dados públicos do INPE: focos de calor e alertas DETER',
      'Visão de satélite (Esri) e mapa de fundo OpenStreetMap opcionais',
      'Relatórios gerenciais com exportação CSV',
    ],
    rotas: [
      { rotulo: 'Dashboard ambiental', to: '/intelligence' },
      { rotulo: 'Inteligência ambiental', to: '/intelligence/inteligencia-ambiental' },
    ],
  },
  {
    id: 'flux',
    nome: 'SEMA Flux',
    icone: 'clipboard',
    cor: 'amber',
    resumo: 'Ciclo completo da demanda de fiscalização ambiental, do cadastro à conclusão.',
    funcionalidades: [
      'Cadastro, triagem (com o Agente de Triagem), distribuição, execução e conclusão',
      'Histórico completo e documentos vinculados a cada demanda',
      'Kanban, fluxo de atividades e painel de fiscalização',
      'Controle de prazos (atrasadas) e produtividade por núcleo',
    ],
    rotas: [
      { rotulo: 'Demandas', to: '/flux/demandas' },
      { rotulo: 'Fluxo de atividades', to: '/flux/kanban' },
    ],
  },
  {
    id: 'docia',
    nome: 'SEMA DocIA',
    icone: 'file',
    cor: 'violet',
    resumo: 'Gestão documental com busca textual, versões, comparação e o Assistente DocIA.',
    funcionalidades: [
      'Upload de PDF/TXT com extração de texto e versões',
      'Pesquisa textual (sem acento e caixa) e vínculo com demandas',
      'Comparação de documentos (diferenças lado a lado)',
      'Assistente DocIA: agente que busca, lê e responde com citações conferidas',
    ],
    rotas: [
      { rotulo: 'Documentos', to: '/docia/documentos' },
      { rotulo: 'Assistente DocIA', to: '/docia/assistente' },
    ],
  },
];

/** Descrição curta de cada perfil (a matriz detalhada vem de PerfisPermissoes). */
export const PERFIS_DESCRICAO = {
  ADMIN: 'Acesso completo, inclusive usuários, setores, equipes, auditoria e este painel.',
  GESTOR: 'Comanda o fluxo: triagem, distribuição, conclusão e devolução; vê a estrutura.',
  FISCAL: 'Executa a fiscalização das demandas atribuídas a ele; vê só as da sua equipe.',
  ANALISTA: 'Cadastra e faz a triagem das demandas (com o Agente de Triagem).',
  CONSULTA: 'Somente leitura: demandas, painéis, relatórios e documentos.',
};

/**
 * Componentes do diagrama de arquitetura. `estado` liga ao id da verificação ao vivo
 * (api, banco, ia, inpe, armazenamento) ou às checagens do navegador (esri, osm).
 */
export const COMPONENTES = [
  {
    id: 'navegador',
    nome: 'Navegador',
    tipo: 'Usuário',
    x: 30,
    y: 150,
    descricao:
      'Interface React (SPA) usada pelos perfis. Só fala com o servidor web do próprio sistema.',
    conexoes: ['Servidor web (Nginx) por HTTP'],
  },
  {
    id: 'web',
    nome: 'Servidor web',
    tipo: 'Nginx',
    x: 215,
    y: 150,
    estado: 'web',
    descricao:
      'Entrega a interface e faz proxy para a API e para as imagens de satélite (a chave da Esri fica só aqui, no servidor).',
    conexoes: ['API (/api)', 'Esri World Imagery (/tiles/esri)'],
  },
  {
    id: 'api',
    nome: 'API',
    tipo: 'Spring Boot · Java 21',
    x: 400,
    y: 150,
    estado: 'api',
    descricao:
      'Regras de negócio, autorização por perfil, auditoria e os agentes de IA (laço de ferramentas).',
    conexoes: [
      'Banco Oracle',
      'IA local (Ollama)',
      'Armazenamento de arquivos',
      'Dados do INPE importados',
    ],
  },
  {
    id: 'banco',
    nome: 'Banco de dados',
    tipo: 'Oracle 23ai Free',
    x: 600,
    y: 40,
    estado: 'banco',
    descricao:
      'Demandas, documentos (metadados e texto), usuários, auditoria e pontos do INPE. Schema via Flyway.',
    conexoes: ['API (JDBC)'],
  },
  {
    id: 'ia',
    nome: 'IA local',
    tipo: 'Ollama · modelo aberto',
    x: 600,
    y: 150,
    estado: 'ia',
    descricao:
      'Modelo de linguagem aberto rodando na própria máquina (GPU). Sem custo e sem enviar dados para fora; só a API o acessa.',
    conexoes: ['API (rede interna, sem porta no host)'],
  },
  {
    id: 'armazenamento',
    nome: 'Arquivos',
    tipo: 'Volume Docker',
    x: 600,
    y: 260,
    estado: 'armazenamento',
    descricao: 'Arquivos PDF/TXT do DocIA guardados em volume (nunca no banco).',
    conexoes: ['API (sistema de arquivos)'],
  },
  {
    id: 'inpe',
    nome: 'INPE',
    tipo: 'Dados públicos',
    x: 400,
    y: 300,
    estado: 'inpe',
    externo: true,
    descricao:
      'Focos de calor (Programa Queimadas) e alertas DETER (TerraBrasilis), baixados por script e importados na API — não é integração em tempo real.',
    conexoes: ['Importação para o banco (script de referência)'],
  },
  {
    id: 'esri',
    nome: 'Esri',
    tipo: 'Imagens de satélite',
    x: 215,
    y: 300,
    estado: 'esri',
    externo: true,
    descricao:
      'World Imagery (ArcGIS Location Platform) para a visão de satélite do mapa; precisa de internet e da chave no servidor.',
    conexoes: ['Servidor web (proxy com a chave)'],
  },
  {
    id: 'osm',
    nome: 'OpenStreetMap',
    tipo: 'Mapa de fundo',
    x: 30,
    y: 300,
    estado: 'osm',
    externo: true,
    descricao: 'Mapa de fundo opcional, carregado direto pelo navegador; precisa de internet.',
    conexoes: ['Navegador (tiles públicos)'],
  },
];

/** Ligações do diagrama: [de, para, rótulo]. */
export const LIGACOES = [
  ['navegador', 'web', 'HTTP'],
  ['web', 'api', '/api'],
  ['api', 'banco', 'JDBC'],
  ['api', 'ia', 'ferramentas'],
  ['api', 'armazenamento', 'arquivos'],
  ['inpe', 'api', 'importação'],
  ['esri', 'web', 'satélite'],
  ['osm', 'navegador', 'mapa'],
];

/** Integrações e serviços externos: o que são e como se comportam. */
export const INTEGRACOES = [
  {
    id: 'ia',
    nome: 'Ollama (IA local)',
    tipo: 'Serviço interno',
    comportamento:
      'Responde aos agentes pela rede interna do Docker. A API carrega o modelo na GPU ao iniciar e ele fica 4 h na memória; Assistente DocIA ~3 s por pergunta e triagem ~7 s. Se parar, os agentes usam as regras locais.',
    custo: 'Zero',
    dados: 'Não saem da máquina',
  },
  {
    id: 'inpe',
    nome: 'INPE — focos de calor e DETER',
    tipo: 'Dados públicos importados',
    comportamento:
      'Pacotes baixados por script e importados no banco; o mapa e o Agente de Triagem consultam o banco, então funcionam sem internet.',
    custo: 'Zero (dados públicos, com atribuição)',
    dados: 'Somente leitura',
  },
  {
    id: 'esri',
    nome: 'Esri World Imagery',
    tipo: 'Serviço externo (opcional)',
    comportamento:
      'O navegador pede as imagens ao servidor web, que acrescenta a chave e busca na Esri. Sem chave ou sem internet, o botão "Visão de satélite" fica desabilitado.',
    custo: 'Chave gratuita de desenvolvedor (uso em produção exige licença do órgão)',
    dados: 'Só coordenadas das imagens pedidas',
  },
  {
    id: 'osm',
    nome: 'OpenStreetMap',
    tipo: 'Serviço externo (opcional)',
    comportamento:
      'Mapa de fundo carregado pelo navegador; desligado por padrão. Sem internet, o mapa de MT continua funcionando (malha offline).',
    custo: 'Zero (uso justo, com atribuição)',
    dados: 'Só coordenadas das imagens pedidas',
  },
  {
    id: 'claude',
    nome: 'Claude (Anthropic)',
    tipo: 'Provedor de IA opcional (futuro)',
    comportamento:
      'Suportado pelo código (SDK oficial), mas desligado: exige chave com créditos. Pode ser ativado por configuração, sem mudar código.',
    custo: 'Pago por uso',
    dados: 'Enviados à API da Anthropic (só dados fictícios)',
  },
];

/** Tecnologias por camada. */
export const TECNOLOGIAS = [
  {
    camada: 'Interface',
    itens: ['React 18', 'Vite', 'Bootstrap 5.3', 'React Router', 'Chart.js', 'Leaflet', 'Lucide'],
  },
  {
    camada: 'API',
    itens: ['Java 21', 'Spring Boot 3.5', 'Spring Security + JWT', 'Flyway', 'springdoc (OpenAPI)'],
  },
  { camada: 'Dados', itens: ['Oracle 23ai Free', 'Volume de arquivos', 'Malha IBGE (GeoJSON)'] },
  {
    camada: 'IA',
    itens: ['Ollama', 'Qwen3-4B-Instruct (Apache 2.0)', 'SDK anthropic-java (opcional)'],
  },
  {
    camada: 'Infra e qualidade',
    itens: [
      'Docker Compose',
      'Nginx',
      'GitHub Actions',
      'JUnit 5 / Mockito',
      'Vitest / Testing Library',
      'MSW',
    ],
  },
];

/** Como o sistema foi desenvolvido com o Claude Code. */
export const DESENVOLVIMENTO = [
  {
    titulo: 'Fluxo por Issues',
    icone: 'clipboard',
    texto:
      'Todo trabalho nasce de uma Issue no GitHub, vira um branch feature/GH-n, um PR com CI (testes, build e Docker) e só então é mesclado.',
  },
  {
    titulo: 'Subagentes especializados',
    icone: 'team',
    texto:
      'implementador (backend e frontend), validador-qa, revisor, planejador e diagnosticador, coordenados pelo comando /next-issue.',
  },
  {
    titulo: 'Autopilot',
    icone: 'workflow',
    texto:
      'Duas sessões em paralelo (API e Web) implementando Issues com merge automático só com CI verde e critérios comprovados.',
  },
  {
    titulo: 'Skills',
    icone: 'sparkles',
    texto:
      'preparar-demo, verificar-seguranca, nova-issue-sema, preparar-tag, dados-ficticios, revisao-visual-mapa, paridade-prototipo e integrar-camada-externa.',
  },
  {
    titulo: 'Revisão visual no navegador',
    icone: 'eye',
    texto:
      'Telas conferidas no Chrome pelo Claude (mapa, cliques, agentes), além dos testes automatizados.',
  },
  {
    titulo: 'Segurança',
    icone: 'audit',
    texto:
      'Sem segredos no código, chaves só no servidor, varredura do diff antes de cada PR e dados exclusivamente fictícios.',
  },
];
