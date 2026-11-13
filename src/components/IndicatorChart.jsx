import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { COR_GRADE, COR_TEXTO } from '../utils/paleta.js';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const FONTE = { size: 14 };

function opcoesBase({
  rotulosCompletos,
  rotulosCurtos,
  tipo,
  horizontal,
  legenda,
  stacked,
  tituloEixo,
  tituloEixoDireito,
}) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: legenda,
        position: tipo === 'doughnut' ? 'right' : 'bottom',
        labels: { color: COR_TEXTO, font: FONTE, boxWidth: 14 },
      },
      tooltip: {
        titleFont: FONTE,
        bodyFont: FONTE,
        ...(rotulosCompletos
          ? {
              callbacks: {
                title: (itens) => rotulosCompletos[itens[0]?.dataIndex] ?? itens[0]?.label,
              },
            }
          : {}),
      },
    },
  };
  if (tipo === 'doughnut') return base;
  const eixoValor = {
    beginAtZero: true,
    stacked,
    title: tituloEixo ? { display: true, text: tituloEixo, color: COR_TEXTO } : undefined,
    ticks: { color: COR_TEXTO, font: FONTE, precision: 0 },
    grid: { color: COR_GRADE },
  };
  const eixoCategoria = {
    stacked,
    ticks: {
      color: COR_TEXTO,
      font: FONTE,
      ...(rotulosCurtos ? { maxRotation: 0, autoSkip: false } : {}),
    },
    grid: { display: false },
  };
  return {
    ...base,
    indexAxis: horizontal ? 'y' : 'x',
    scales: {
      ...(horizontal ? { x: eixoValor, y: eixoCategoria } : { x: eixoCategoria, y: eixoValor }),
      ...(tituloEixoDireito
        ? {
            y1: {
              position: 'right',
              beginAtZero: true,
              grid: { display: false },
              ticks: { color: COR_TEXTO, font: FONTE, precision: 0 },
              title: { display: true, text: tituloEixoDireito, color: COR_TEXTO },
            },
          }
        : {}),
    },
  };
}

/**
 * Gráfico Chart.js com tabela equivalente para leitores de tela.
 * `tipo`: 'bar' | 'line' | 'doughnut'. `datasets`: `[{ label, data, color | colors, linha?, eixoDireito? }]`.
 * `linha: true` desenha a série como linha sobre as barras (eixo `y1` se `eixoDireito`).
 * `rotulosCompletos` (opcional): nomes completos exibidos no tooltip quando `labels` traz rótulos curtos.
 * `chartRef` expõe a instância Chart.js (ex.: exportar PNG). `stacked` empilha as barras; `tituloEixo`/`tituloEixoDireito` nomeiam os eixos.
 */
export default function IndicatorChart({
  tipo = 'bar',
  horizontal = false,
  labels,
  datasets,
  ariaLabel,
  altura = 280,
  stacked = false,
  tituloEixo,
  tituloEixoDireito,
  chartRef,
  rotulosCompletos,
}) {
  const legenda = tipo === 'doughnut' || datasets.length > 1;
  const dados = {
    labels,
    datasets: datasets.map(({ label, data, color, colors, linha, eixoDireito }) => ({
      ...(eixoDireito ? { yAxisID: 'y1' } : {}),
      label,
      data,
      backgroundColor: colors ?? color,
      borderColor: tipo === 'line' ? color : tipo === 'doughnut' ? '#ffffff' : undefined,
      borderWidth: tipo === 'line' ? 3 : tipo === 'doughnut' ? 2 : 0,
      pointRadius: tipo === 'line' ? 4 : undefined,
      tension: tipo === 'line' ? 0.25 : undefined,
      ...(linha
        ? { type: 'line', borderColor: color, tension: 0.35, pointRadius: 3, borderWidth: 2 }
        : {}),
    })),
  };
  const opcoes = opcoesBase({
    rotulosCompletos,
    rotulosCurtos: Boolean(rotulosCompletos),
    tipo,
    horizontal,
    legenda,
    stacked,
    tituloEixo,
    tituloEixoDireito,
  });
  const Componente = tipo === 'line' ? Line : tipo === 'doughnut' ? Doughnut : Bar;

  return (
    <figure className="nx-chart-figure">
      <div className="nx-chart-canvas" style={{ height: altura }}>
        <Componente
          ref={chartRef}
          data={dados}
          options={opcoes}
          role="img"
          aria-label={ariaLabel}
        />
      </div>
      <table className="visually-hidden">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            {datasets.map((d) => (
              <th scope="col" key={d.label}>
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((rotulo, i) => (
            <tr key={`${rotulo}-${i}`}>
              <th scope="row">{rotulosCompletos?.[i] ?? rotulo}</th>
              {datasets.map((d) => (
                <td key={d.label}>{d.data[i]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
