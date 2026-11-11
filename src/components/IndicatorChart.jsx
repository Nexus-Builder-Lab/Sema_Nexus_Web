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

function opcoesBase({ tipo, horizontal, legenda }) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: legenda,
        position: tipo === 'doughnut' ? 'right' : 'bottom',
        labels: { color: COR_TEXTO, font: FONTE, boxWidth: 14 },
      },
      tooltip: { titleFont: FONTE, bodyFont: FONTE },
    },
  };
  if (tipo === 'doughnut') return base;
  const eixoValor = {
    beginAtZero: true,
    ticks: { color: COR_TEXTO, font: FONTE, precision: 0 },
    grid: { color: COR_GRADE },
  };
  const eixoCategoria = { ticks: { color: COR_TEXTO, font: FONTE }, grid: { display: false } };
  return {
    ...base,
    indexAxis: horizontal ? 'y' : 'x',
    scales: horizontal ? { x: eixoValor, y: eixoCategoria } : { x: eixoCategoria, y: eixoValor },
  };
}

/**
 * Gráfico Chart.js com tabela equivalente para leitores de tela.
 * `tipo`: 'bar' | 'line' | 'doughnut'. `datasets`: `[{ label, data, color | colors }]`.
 */
export default function IndicatorChart({
  tipo = 'bar',
  horizontal = false,
  labels,
  datasets,
  ariaLabel,
  altura = 280,
}) {
  const legenda = tipo === 'doughnut' || datasets.length > 1;
  const dados = {
    labels,
    datasets: datasets.map(({ label, data, color, colors }) => ({
      label,
      data,
      backgroundColor: colors ?? color,
      borderColor: tipo === 'line' ? color : tipo === 'doughnut' ? '#ffffff' : undefined,
      borderWidth: tipo === 'line' ? 3 : tipo === 'doughnut' ? 2 : 0,
      pointRadius: tipo === 'line' ? 4 : undefined,
      tension: tipo === 'line' ? 0.25 : undefined,
    })),
  };
  const opcoes = opcoesBase({ tipo, horizontal, legenda });
  const Componente = tipo === 'line' ? Line : tipo === 'doughnut' ? Doughnut : Bar;

  return (
    <figure className="m-0">
      <div className="nx-chart-canvas" style={{ height: altura }}>
        <Componente data={dados} options={opcoes} role="img" aria-label={ariaLabel} />
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
              <th scope="row">{rotulo}</th>
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
