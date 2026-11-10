// Catálogos de domínio usados na interface (rótulos e cores).
// Valores conforme Sema_Nexus_API/docs/DATABASE.md; a API é quem valida.

export const STATUS_DEMANDA = {
  PENDENTE: { label: 'Pendente', color: 'gray' },
  EM_TRIAGEM: { label: 'Em triagem', color: 'violet' },
  AGUARDANDO_DISTRIBUICAO: { label: 'Aguardando distribuição', color: 'amber' },
  DISTRIBUIDA: { label: 'Distribuída', color: 'blue' },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'orange' },
  AGUARDANDO_CONCLUSAO: { label: 'Aguardando conclusão', color: 'teal' },
  FINALIZADA: { label: 'Finalizada', color: 'green' },
};

export const PRIORIDADES = {
  BAIXA: { label: 'Baixa', color: 'gray' },
  MEDIA: { label: 'Média', color: 'blue' },
  ALTA: { label: 'Alta', color: 'amber' },
  URGENTE: { label: 'Urgente', color: 'red' },
};

/** Normaliza "Média", "media" ou "MEDIA" para a chave do catálogo. */
export function normalizarChave(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

export function buscarNoCatalogo(catalogo, valor) {
  const item = catalogo[normalizarChave(valor)];
  if (item) return item;
  return { label: valor ? String(valor) : '—', color: 'gray' };
}
