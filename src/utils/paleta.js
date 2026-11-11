// Paleta dos gráficos: cores distinguíveis entre si (inclusive para daltonismo) e com contraste
// suficiente sobre fundo branco para leitura em projetor. A cor nunca é a única informação:
// todo gráfico tem rótulos/legenda e uma tabela equivalente para leitores de tela.

export const CORES_SERIE = [
  '#166534', // verde institucional
  '#1d4ed8', // azul
  '#c2410c', // laranja escuro
  '#7c3aed', // violeta
  '#0f766e', // verde-azulado
  '#b45309', // âmbar escuro
  '#be123c', // vermelho-rosado
  '#4b5563', // cinza
];

// Uma cor fixa por situação do fluxo (mesma ordem do catálogo de status).
export const CORES_STATUS = {
  PENDENTE: '#6b7280',
  EM_TRIAGEM: '#7c3aed',
  AGUARDANDO_DISTRIBUICAO: '#b45309',
  DISTRIBUIDA: '#1d4ed8',
  EM_ANDAMENTO: '#c2410c',
  AGUARDANDO_CONCLUSAO: '#0f766e',
  FINALIZADA: '#166534',
};

export const CORES_BIOMA = {
  AMAZONIA: '#166534',
  CERRADO: '#b45309',
  PANTANAL: '#1d4ed8',
};

export const COR_TEXTO = '#1f2937';
export const COR_GRADE = '#e5e7eb';

export function corDaSerie(indice) {
  return CORES_SERIE[indice % CORES_SERIE.length];
}
