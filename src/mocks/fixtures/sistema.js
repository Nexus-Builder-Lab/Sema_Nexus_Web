// Painel do sistema (API#114) para os mocks: tudo operando com a IA local.
export function painelSistemaMock() {
  const agora = new Date().toISOString().slice(0, 19);
  return {
    geradoEm: agora,
    sistema: {
      versao: '0.1.0-SNAPSHOT',
      perfilAtivo: 'demo',
      java: '21.0.13',
      iniciadoEm: agora,
      segundosNoAr: 4500,
      memoriaUsadaMb: 210,
      memoriaMaximaMb: 4096,
    },
    verificacoes: [
      {
        id: 'api',
        nome: 'API (Spring Boot)',
        estado: 'OK',
        latenciaMs: 1,
        resumo: 'Respondendo.',
        detalhes: { perfil: 'demo' },
      },
      {
        id: 'banco',
        nome: 'Banco de dados (Oracle)',
        estado: 'OK',
        latenciaMs: 12,
        resumo: 'Conectado.',
        detalhes: { versao: 'Oracle 23ai Free', demandas: 120, documentos: 12, usuariosAtivos: 16 },
      },
      {
        id: 'ia',
        nome: 'IA dos agentes',
        estado: 'OK',
        latenciaMs: 7,
        resumo: 'Modelo local disponível (sem custo; os dados não saem do servidor).',
        detalhes: {
          provedor: 'Ollama (local)',
          versao: '0.40.11',
          provedorConfigurado: 'OLLAMA',
          modo: 'LOCAL',
          latenciaMs: 2,
          manterCarregado: '4h',
          aquecimento: { estado: 'PRONTO', duracaoMs: 9400, em: '2026-11-16T15:00:00Z' },
          instalados: [
            {
              nome: 'qwen3:4b-instruct',
              parametros: '4.0B',
              quantizacao: 'Q4_K_M',
              tamanhoMb: 2497,
            },
          ],
          carregados: [
            {
              nome: 'qwen3:4b-instruct',
              percentualGpu: 100,
              memoriaVideoMb: 3900,
              memoriaMb: 3900,
            },
          ],
        },
      },
      {
        id: 'inpe',
        nome: 'Dados públicos do INPE (focos de calor e DETER)',
        estado: 'OK',
        latenciaMs: 5,
        resumo: '19957 registros públicos em 2 pacote(s).',
        detalhes: {
          totalRegistros: 19957,
          importacoes: [
            {
              tipo: 'FOCO_CALOR',
              fonte: 'INPE — Programa Queimadas',
              periodoDe: '2026-08-01',
              periodoAte: '2026-10-31',
              registros: 18000,
              licenca: 'CC BY-SA 4.0',
            },
            {
              tipo: 'DESMATAMENTO',
              fonte: 'INPE — TerraBrasilis (DETER)',
              periodoDe: '2026-09-01',
              periodoAte: '2026-10-31',
              registros: 1957,
              licenca: 'CC BY-SA 4.0',
            },
          ],
        },
      },
      {
        id: 'armazenamento',
        nome: 'Armazenamento de documentos',
        estado: 'OK',
        latenciaMs: 7,
        resumo: '12 arquivo(s); 878 GB livres.',
        detalhes: { arquivos: 12 },
      },
    ],
    agentes: [
      {
        id: 'triagem',
        nome: 'Agente de Triagem',
        modulo: 'SEMA Flux',
        modo: 'LOCAL',
        modelo: 'qwen3:4b-instruct',
        ferramentas: ['obter_demanda', 'buscar_demandas_semelhantes', 'alertas_inpe_municipio'],
        metricas: {
          agente: 'triagem',
          execucoes: 10,
          sucessos: 9,
          falhas: 1,
          demonstrativo: 2,
          tempoMedioMs: 9200,
          ultimaExecucao: agora,
        },
      },
      {
        id: 'docia',
        nome: 'Assistente DocIA',
        modulo: 'SEMA DocIA',
        modo: 'LOCAL',
        modelo: 'qwen3:4b-instruct',
        ferramentas: ['buscar_documentos', 'ler_documento'],
        metricas: {
          agente: 'docia',
          execucoes: 4,
          sucessos: 4,
          falhas: 0,
          demonstrativo: 0,
          tempoMedioMs: 8100,
          ultimaExecucao: agora,
        },
      },
    ],
  };
}
