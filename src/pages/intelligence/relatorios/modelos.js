import { DEMO_SEAL_TEXT } from '../../../components/DemoSeal.jsx';
import { formatarData } from '../../../utils/datas.js';

// Modelos dos relatórios gerenciais: transformam as respostas da API em
// `{ kpis, secoes, tabela }` (KPIs, tabelas de apoio e tabela principal). Sem dados próprios.

export const TIPOS = [
  { value: 'demandas', label: 'Demandas do período' },
  { value: 'prazos', label: 'Situação de prazos (demandas ativas)' },
  { value: 'produtividade', label: 'Produtividade por setor e servidor' },
  { value: 'documentos', label: 'Documentos cadastrados' },
];

export const tituloDoTipo = (tipo) => TIPOS.find((t) => t.value === tipo)?.label ?? TIPOS[0].label;

const STATUS_FINAL = 'FINALIZADA';
const num = (n, casas = 0) =>
  Number(n ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
const pct = (parte, total, casas = 1) => (total ? `${num((parte * 100) / total, casas)}%` : '—');
const valor = (v) => (v == null || v === '' ? '—' : v);
const ref = (r) => (r && typeof r === 'object' ? (r.nome ?? null) : r);
const percentual = (n) => (n == null ? '—' : `${num(n, 1)}%`);
const tempo = (n) => (n == null ? '—' : num(n, 1));

/** KPIs e distribuição por categoria a partir das demandas (até 100 mais recentes) da consulta. */
export function modeloDemandas(pagina, rotuloCategoria, hoje) {
  const lista = pagina?.content ?? [];
  const finalizadas = lista.filter((d) => d.status === STATUS_FINAL);
  const ativas = lista.filter((d) => d.status !== STATUS_FINAL);
  const vencidas = ativas.filter((d) => d.prazo && d.prazo < hoje);
  const contagem = new Map();
  lista.forEach((d) => {
    const rotulo = rotuloCategoria(d.categoria) || 'Sem categoria';
    contagem.set(rotulo, (contagem.get(rotulo) ?? 0) + 1);
  });
  const distribuicao = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([rotulo, qtd]) => [rotulo, num(qtd), pct(qtd, lista.length)]);
  return {
    kpis: [
      { label: 'Demandas recebidas', valor: num(lista.length) },
      { label: 'Concluídas', valor: num(finalizadas.length) },
      { label: 'Ativas', valor: num(ativas.length) },
      { label: 'Vencidas', valor: num(vencidas.length) },
    ],
    secoes: [
      {
        titulo: 'Distribuição por tipo',
        headers: ['Tipo de demanda', 'Quantidade', '%'],
        rows: distribuicao,
      },
    ],
    truncado: Boolean(pagina) && pagina.totalElements > lista.length,
  };
}

const situacaoPrazo = (i) => {
  if (i.estado === 'VENCIDA') return `Vencida há ${i.diasAtraso ?? 0} dia(s)`;
  if (i.estado === 'PROXIMA') return `Vence em ${i.diasRestantes ?? 0} dia(s)`;
  return 'Dentro do prazo';
};

/** `resumo` (prazos/resumo) e `itens` (prazos das demandas ativas, ordenados por prazo). */
export function modeloPrazos(resumo, itens, rotuloStatus, rotuloPrioridade) {
  const ativas = (resumo?.vencidas ?? 0) + (resumo?.proximas ?? 0) + (resumo?.noPrazo ?? 0);
  return {
    kpis: [
      { label: 'Demandas ativas', valor: num(ativas) },
      { label: 'Vencidas', valor: num(resumo?.vencidas) },
      { label: 'Próximas do vencimento', valor: num(resumo?.proximas) },
      { label: 'Dentro do prazo', valor: num(resumo?.noPrazo) },
    ],
    secoes: [],
    tabela: {
      headers: [
        'Número',
        'Título',
        'Município',
        'Equipe',
        'Fiscal',
        'Prioridade',
        'Situação',
        'Prazo',
        'Situação do prazo',
      ],
      rows: itens.map((i) => [
        i.numero,
        i.titulo,
        valor(i.municipio),
        valor(i.equipe),
        valor(i.fiscal),
        rotuloPrioridade(i.prioridade) || '—',
        rotuloStatus(i.status) || '—',
        formatarData(i.prazo),
        situacaoPrazo(i),
      ]),
    },
  };
}

export function modeloProdutividade(p) {
  const k = p?.kpis ?? {};
  const linha = (x) => [num(x.total), num(x.concluidas), num(x.ativas), num(x.atrasadas)];
  const tempoSetor = new Map(
    (p?.tempoMedioPorSetor ?? []).map((t) => [t.setorId, t.tempoMedioDias]),
  );
  return {
    kpis: [
      { label: 'Demandas', valor: num(k.demandasNoPeriodo) },
      { label: '% de conclusão', valor: percentual(k.percentualConclusao) },
      {
        label: 'Tempo médio',
        valor:
          k.tempoMedioConclusaoDias == null ? '—' : `${num(k.tempoMedioConclusaoDias, 1)} dias`,
      },
      { label: 'Concluídas no prazo', valor: percentual(k.percentualConcluidasNoPrazo) },
    ],
    secoes: [
      {
        titulo: 'Por setor',
        headers: ['Setor', 'Total', 'Concluídas', 'Ativas', 'Atrasadas', 'Tempo médio (d)'],
        rows: (p?.porSetorSituacao ?? []).map((s) => [
          s.setor,
          ...linha(s),
          tempo(tempoSetor.get(s.setorId)),
        ]),
      },
    ],
    tituloTabela: 'Por servidor',
    tabela: {
      headers: [
        'Servidor',
        'Total',
        'Concluídas',
        'Ativas',
        'Atrasadas',
        'Tempo médio (d)',
        '% conclusão',
      ],
      rows: (p?.porResponsavel ?? []).map((r) => [
        r.fiscal,
        ...linha(r),
        tempo(r.tempoMedioDias),
        percentual(r.percentualConclusao),
      ]),
    },
  };
}

export function modeloDocumentos(pagina) {
  const lista = pagina?.content ?? [];
  const total = pagina?.totalElements ?? lista.length;
  const distintos = (campo) => new Set(lista.map((d) => ref(d[campo])).filter(Boolean)).size;
  return {
    kpis: [
      { label: 'Documentos', valor: num(total) },
      { label: 'Categorias', valor: num(distintos('categoria')) },
      { label: 'Com arquivo anexo', valor: num(lista.filter((d) => d.nomeArquivo).length) },
      { label: 'Municípios', valor: num(distintos('municipio')) },
    ],
    secoes: [],
    tabela: {
      headers: ['Documento', 'Categoria', 'Tipo', 'Município', 'Data do documento', 'Responsável'],
      rows: lista.map((d) => [
        d.titulo,
        valor(d.categoria),
        valor(d.tipo),
        valor(ref(d.municipio)),
        formatarData(d.dataDocumento),
        valor(ref(d.responsavel)),
      ]),
    },
    truncado: total > lista.length,
  };
}

const BOM = String.fromCharCode(0xfeff);

const escapar = (celula) => {
  let texto = String(celula ?? '');
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`; // proteção contra injeção de fórmula
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

/** CSV no padrão da API: BOM UTF-8, `;`, CRLF, 1ª linha com o aviso demonstrativo. */
export function gerarCsv(headers, rows) {
  const linhas = [[DEMO_SEAL_TEXT], headers, ...rows];
  return `${BOM}${linhas.map((l) => l.map(escapar).join(';')).join('\r\n')}\r\n`;
}

/** Produtividade: setores e servidores num só arquivo. */
export function csvProdutividade(modelo) {
  const setores = modelo.secoes[0].rows.map((r) => ['Setor', ...r.slice(0, 5), r[5], '']);
  const servidores = modelo.tabela.rows.map((r) => ['Servidor', ...r]);
  return {
    headers: [
      'Nível',
      'Nome',
      'Total',
      'Concluídas',
      'Ativas',
      'Atrasadas',
      'Tempo médio (d)',
      '% conclusão',
    ],
    rows: [...setores, ...servidores],
  };
}
