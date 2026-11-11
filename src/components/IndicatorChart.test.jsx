import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import IndicatorChart from './IndicatorChart.jsx';

const recebidos = {};

// jsdom não tem canvas: os componentes do Chart.js viram stubs que guardam as props recebidas.
vi.mock('react-chartjs-2', () => {
  const stub = (tipo) =>
    function Grafico({ data, options, ...resto }) {
      recebidos[tipo] = { data, options };
      return <div data-testid={`grafico-${tipo}`} {...resto} />;
    };
  return { Bar: stub('bar'), Line: stub('line'), Doughnut: stub('doughnut') };
});

describe('IndicatorChart', () => {
  const labels = ['Cuiabá', 'Sinop'];

  it('escolhe o tipo de gráfico e expõe rótulo acessível', () => {
    render(
      <IndicatorChart
        tipo="line"
        ariaLabel="Evolução mensal"
        labels={labels}
        datasets={[{ label: 'Cadastradas', data: [4, 2], color: '#166534' }]}
      />,
    );
    expect(screen.getByTestId('grafico-line')).toHaveAttribute('aria-label', 'Evolução mensal');
    expect(recebidos.line.data.datasets[0].borderColor).toBe('#166534');
    expect(recebidos.line.options.plugins.legend.display).toBe(false);
  });

  it('oferece tabela equivalente para leitores de tela', () => {
    render(
      <IndicatorChart
        ariaLabel="Demandas por município"
        labels={labels}
        datasets={[{ label: 'Demandas', data: [4, 2], color: '#1d4ed8' }]}
      />,
    );
    const tabela = screen.getByRole('table', { name: 'Demandas por município' });
    const linhas = within(tabela).getAllByRole('row');
    expect(linhas).toHaveLength(3);
    expect(within(linhas[1]).getByRole('rowheader')).toHaveTextContent('Cuiabá');
    expect(within(linhas[1]).getByRole('cell')).toHaveTextContent('4');
  });

  it('barra horizontal usa eixo y como categoria; rosca mostra legenda', () => {
    const { unmount } = render(
      <IndicatorChart
        horizontal
        ariaLabel="Por categoria"
        labels={labels}
        datasets={[{ label: 'Demandas', data: [1, 2], color: '#c2410c' }]}
      />,
    );
    expect(recebidos.bar.options.indexAxis).toBe('y');
    unmount();

    render(
      <IndicatorChart
        tipo="doughnut"
        ariaLabel="Por bioma"
        labels={labels}
        datasets={[{ label: 'Demandas', data: [1, 2], colors: ['#166534', '#1d4ed8'] }]}
      />,
    );
    expect(recebidos.doughnut.options.plugins.legend.display).toBe(true);
    expect(recebidos.doughnut.data.datasets[0].backgroundColor).toEqual(['#166534', '#1d4ed8']);
  });
});
