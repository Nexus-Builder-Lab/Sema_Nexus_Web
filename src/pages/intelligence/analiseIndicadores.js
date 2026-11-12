import {
  obterPorBioma,
  obterPorCategoria,
  obterPorMunicipio,
  obterPorSituacao,
  obterSerieMensal,
} from '../../api/intelligenceApi.js';
import { CORES_SERIE } from '../../utils/paleta.js';

const fmt = (v, casas = 0) =>
  Number(v ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

export const formatarMesCurto = (mes) => {
  const [ano, n] = String(mes).split('-');
  const nomes = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  return ano && n ? `${nomes[Number(n) - 1]}/${ano.slice(2)}` : String(mes);
};

/** Soma `dias` a uma data "AAAA-MM-DD" (meio-dia local, evita virada por fuso). */
export function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias, 12);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** Dias entre duas datas ISO (inclusivo = +1 feito pelo chamador). */
export function diferencaDias(de, ate) {
  const t = (s) => {
    const [a, m, d] = s.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((t(ate) - t(de)) / 86400000);
}

/** Período anterior de mesma duração, imediatamente antes de `de`. */
export function periodoAnterior(de, ate) {
  const duracao = diferencaDias(de, ate) + 1;
  return { de: somarDias(de, -duracao), ate: somarDias(de, -1) };
}

const contagem = (itens, rotulo, total = 'total') =>
  itens.map((i) => ({ rotulo: rotulo(i), valor: i[total] ?? 0 }));

/**
 * Indicadores disponíveis na API (filtros `de`/`ate`). Cada `montar(resposta, base)`
 * devolve `{ labels, series: [{ label, data, color }], unidade, tipo }`; `base` (rótulos)
 * força as mesmas categorias na comparação com o período anterior.
 */
export const INDICADORES = {
  recebidas_concluidas: {
    label: 'Demandas recebidas × concluídas (mensal)',
    temporal: true,
    buscar: obterSerieMensal,
    montar: ({ itens = [] }) => ({
      labels: itens.map((i) => formatarMesCurto(i.mes)),
      unidade: 'demandas',
      tipo: 'bar',
      series: [
        { label: 'Recebidas', color: '#1D4ED8', data: itens.map((i) => i.cadastradas) },
        { label: 'Concluídas', color: '#16A34A', data: itens.map((i) => i.finalizadas) },
      ],
    }),
  },
  demandas_municipio: {
    label: 'Demandas por município (top 15)',
    buscar: obterPorMunicipio,
    montar: ({ itens = [] }, base) =>
      agrupar(
        contagem(itens, (i) => i.municipio),
        'Demandas',
        'hbar',
        CORES_SERIE[2],
        base,
        15,
      ),
  },
  demandas_categoria: {
    label: 'Demandas por categoria',
    buscar: obterPorCategoria,
    montar: ({ itens = [] }, base) =>
      agrupar(
        contagem(itens, (i) => i.rotulo),
        'Demandas',
        'bar',
        CORES_SERIE[0],
        base,
      ),
  },
  demandas_situacao: {
    label: 'Demandas por situação',
    buscar: obterPorSituacao,
    montar: ({ itens = [] }, base) =>
      agrupar(
        contagem(itens, (i) => i.rotulo),
        'Demandas',
        'bar',
        CORES_SERIE[1],
        base,
      ),
  },
  demandas_bioma: {
    label: 'Demandas por bioma',
    buscar: obterPorBioma,
    montar: ({ itens = [] }, base) =>
      agrupar(
        contagem(itens, (i) => i.rotulo),
        'Demandas',
        'bar',
        CORES_SERIE[4],
        base,
      ),
  },
};

function agrupar(linhas, serie, tipo, color, base, limite) {
  const ordenadas = base
    ? base.map((r) => linhas.find((l) => l.rotulo === r) ?? { rotulo: r, valor: 0 })
    : limite
      ? linhas.slice(0, limite)
      : linhas;
  return {
    labels: ordenadas.map((l) => l.rotulo),
    unidade: 'demandas',
    tipo,
    series: [{ label: serie, color, data: ordenadas.map((l) => l.valor) }],
  };
}

/** Acrescenta a série do período anterior (cinza) ao resultado atual. */
export function comporComparacao(atual, anterior) {
  return {
    ...atual,
    series: [
      atual.series[0],
      {
        ...anterior.series[0],
        label: `${anterior.series[0].label} (período anterior)`,
        color: '#9CA3AF',
      },
    ],
  };
}

const soma = (lista) => lista.reduce((a, b) => a + b, 0);
const pct = (a, b) => (b ? `${fmt((a / b) * 100)}%` : '0%');

/** Leitura automática por estatística descritiva (sem IA). Devolve lista de { chave, texto, forte }. */
export function gerarLeitura(r, def, id, comparando) {
  const s0 = r.series[0];
  if (!s0?.data.length) return [];
  const linhas = [];
  const max = Math.max(...s0.data);
  linhas.push({
    chave: 'max',
    antes: 'Maior valor em ',
    forte: r.labels[s0.data.indexOf(max)],
    depois: `: ${fmt(max)} ${r.unidade}.`,
  });
  linhas.push({
    chave: 'total',
    antes: 'Total de ',
    forte: fmt(soma(s0.data)),
    depois: ` ${r.unidade} em "${s0.label}".`,
  });
  if (def.temporal && s0.data.length > 1) {
    linhas.push({
      chave: 'media',
      antes: 'Média mensal de ',
      forte: fmt(soma(s0.data) / s0.data.length, 1),
      depois: ` ${r.unidade} em "${s0.label}".`,
    });
    if (id === 'recebidas_concluidas' && r.series[1])
      linhas.push({
        chave: 'taxa',
        antes: 'Taxa de resolução no período: ',
        forte: pct(soma(r.series[1].data), soma(s0.data)),
        depois: ' (concluídas ÷ recebidas).',
      });
  }
  if (comparando && r.series[1]) {
    const a = soma(s0.data);
    const b = soma(r.series[1].data);
    const variacao = b
      ? `${a >= b ? '+' : ''}${fmt(((a - b) / b) * 100, 1)}%`
      : 'sem base de comparação';
    linhas.push({
      chave: 'var',
      antes: 'Variação em relação ao período anterior: ',
      forte: variacao,
      depois: ` (${fmt(b)} → ${fmt(a)}).`,
    });
  }
  if (s0.data.length > 2 && !def.temporal) {
    const top3 = soma([...s0.data].sort((x, y) => y - x).slice(0, 3));
    linhas.push({
      chave: 'top3',
      antes: 'As 3 maiores categorias concentram ',
      forte: pct(top3, soma(s0.data)),
      depois: ' do total.',
    });
  }
  return linhas;
}

/** CSV (separador ";", vírgula decimal) com Categoria + uma coluna por série. */
export function gerarCsvIndicador(r) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const linhas = [['Categoria', ...r.series.map((s) => s.label)].map(esc).join(';')];
  r.labels.forEach((l, i) =>
    linhas.push(
      [esc(l), ...r.series.map((s) => String(s.data[i] ?? 0).replace('.', ','))].join(';'),
    ),
  );
  return linhas.join('\r\n');
}

export function baixarArquivo(nome, blobOuUrl) {
  const url = typeof blobOuUrl === 'string' ? blobOuUrl : URL.createObjectURL(blobOuUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  if (typeof blobOuUrl !== 'string') URL.revokeObjectURL(url);
}

export { fmt as formatarNumero, soma };
