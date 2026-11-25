/**
 * Estado de progresso de um agente de IA acompanhado por SSE (Issue API#135): reduz os eventos
 * `inicio`, `ferramenta_iniciada`, `ferramenta_concluida`, `fallback_demonstrativo` e `delta_texto`.
 */

const ROTULOS = {
  obter_demanda: 'Lendo os dados da demanda',
  buscar_demandas_semelhantes: 'Buscando demandas semelhantes',
  alertas_inpe_municipio: 'Consultando alertas do INPE no município',
  alertas_inpe_raio_coordenada: 'Consultando alertas do INPE ao redor da coordenada',
  demandas_proximas_coordenada: 'Buscando demandas próximas da coordenada',
  documentos_mesma_localidade: 'Buscando documentos da mesma localidade',
  buscar_documentos: 'Buscando nos documentos',
  ler_documento: 'Lendo um documento',
  carga_trabalho_fiscais: 'Verificando a carga de trabalho dos fiscais',
  demandas_ativas_na_regiao: 'Verificando as demandas ativas na região',
  tempo_medio_categoria: 'Consultando o tempo médio da categoria',
};

/** Rótulo em português da ferramenta; nomes desconhecidos viram texto genérico, sem expor o identificador. */
export function rotuloFerramenta(nome) {
  return ROTULOS[nome] ?? 'Consultando dados do sistema';
}

export const PROGRESSO_INICIAL = {
  iniciado: false,
  ferramentas: [],
  texto: '',
  fallback: null,
  alternativa: false,
};

export function reduzirProgresso(estado, evento, dados = {}) {
  switch (evento) {
    case 'inicio':
      return { ...estado, iniciado: true };
    case 'ferramenta_iniciada':
      return {
        ...estado,
        iniciado: true,
        ferramentas: [
          ...estado.ferramentas,
          { ordem: dados.ordem, nome: dados.ferramenta, estado: 'executando', resumo: null },
        ],
      };
    case 'ferramenta_concluida': {
      const novo = {
        ordem: dados.ordem,
        nome: dados.ferramenta,
        estado: dados.erro ? 'erro' : 'ok',
        resumo: dados.resumo ?? null,
      };
      const existe = estado.ferramentas.some((f) => f.ordem === dados.ordem);
      return {
        ...estado,
        ferramentas: existe
          ? estado.ferramentas.map((f) => (f.ordem === dados.ordem ? { ...f, ...novo } : f))
          : [...estado.ferramentas, novo],
      };
    }
    case 'fallback_demonstrativo':
      return { ...estado, fallback: dados.motivo || 'IA indisponível no momento.' };
    case 'delta_texto':
      return { ...estado, texto: estado.texto + (dados.texto ?? '') };
    case 'alternativa':
      return { ...PROGRESSO_INICIAL, alternativa: true };
    default:
      return estado;
  }
}
