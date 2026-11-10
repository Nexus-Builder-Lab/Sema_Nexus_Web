import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ChartCard from './ChartCard.jsx';
import FilterBar from './FilterBar.jsx';
import KpiCard from './KpiCard.jsx';
import PageHeader from './PageHeader.jsx';
import { ToastProvider, useToast } from './Toasts.jsx';

describe('Toasts', () => {
  function Trigger() {
    const { showToast } = useToast();
    return (
      <button type="button" onClick={() => showToast({ message: 'Demanda salva.' })}>
        Salvar
      </button>
    );
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra e fecha a notificação', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda salva.');
    await user.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByText('Demanda salva.')).not.toBeInTheDocument();
  });

  it('some sozinha após a duração', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider duration={1000}>
        <Trigger />
      </ToastProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'Salvar' }).click();
    });
    expect(screen.getByText('Demanda salva.')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText('Demanda salva.')).not.toBeInTheDocument();
  });
});

describe('FilterBar', () => {
  it('envia e limpa filtros', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onClear = vi.fn();
    render(
      <FilterBar onSubmit={onSubmit} onClear={onClear} label="Filtros de demandas">
        <div className="col">
          <label htmlFor="q">Pesquisa</label>
          <input id="q" />
        </div>
      </FilterBar>,
    );
    expect(screen.getByRole('search', { name: 'Filtros de demandas' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Pesquisa'), 'queimada{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('KpiCard, ChartCard e PageHeader', () => {
  it('KpiCard mostra valor ou carregamento', () => {
    const { rerender } = render(<KpiCard label="Demandas" value={42} hint="Dados fictícios" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    rerender(<KpiCard label="Demandas" loading />);
    expect(screen.getByRole('status', { name: 'Carregando Demandas' })).toBeInTheDocument();
  });

  it('ChartCard alterna entre conteúdo, carregamento, erro e vazio', () => {
    const { rerender } = render(
      <ChartCard title="Por status">
        <p>gráfico</p>
      </ChartCard>,
    );
    expect(screen.getByRole('region', { name: 'Por status' })).toHaveTextContent('gráfico');
    rerender(<ChartCard title="Por status" loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<ChartCard title="Por status" error={new Error('Falhou')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou');
    rerender(<ChartCard title="Por status" empty />);
    expect(screen.getByText('Sem dados')).toBeInTheDocument();
  });

  it('PageHeader renderiza título, módulo e ações', () => {
    render(
      <PageHeader
        module="Flux"
        title="Demandas"
        description="Lista de demandas"
        actions={<button type="button">Nova demanda</button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Demandas' })).toBeInTheDocument();
    expect(screen.getByText('Flux')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova demanda' })).toBeInTheDocument();
  });
});
