import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DataTable from './DataTable.jsx';

const columns = [
  { key: 'numero', header: 'Número', sortable: true },
  { key: 'titulo', header: 'Título', sortable: true },
  { key: 'municipio', header: 'Município' },
];

const rows = [
  { id: 1, numero: 'DEM-2026/0002', titulo: 'Queimada em área rural', municipio: 'Sinop' },
  { id: 2, numero: 'DEM-2026/0010', titulo: 'Desmatamento ilegal', municipio: 'Cuiabá' },
  { id: 3, numero: 'DEM-2026/0001', titulo: 'Pesca irregular', municipio: 'Cáceres' },
];

function firstColumn() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
}

describe('DataTable', () => {
  it('renderiza cabeçalhos e linhas', () => {
    render(<DataTable columns={columns} rows={rows} caption="Demandas" />);
    expect(screen.getByRole('table', { name: 'Demandas' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Número/ })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('Cuiabá')).toBeInTheDocument();
  });

  it('ordena localmente ao clicar no cabeçalho, alternando asc/desc', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} rows={rows} />);
    const header = screen.getByRole('columnheader', { name: /Número/ });
    expect(header).toHaveAttribute('aria-sort', 'none');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(firstColumn()).toEqual(['DEM-2026/0001', 'DEM-2026/0002', 'DEM-2026/0010']);

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(firstColumn()).toEqual(['DEM-2026/0010', 'DEM-2026/0002', 'DEM-2026/0001']);
  });

  it('não oferece ordenação em coluna não ordenável', () => {
    render(<DataTable columns={columns} rows={rows} />);
    const header = screen.getByRole('columnheader', { name: 'Município' });
    expect(within(header).queryByRole('button')).not.toBeInTheDocument();
    expect(header).not.toHaveAttribute('aria-sort');
  });

  it('no modo controlado apenas emite a ordenação pedida', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        sort={{ key: 'titulo', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    // Mantém a ordem recebida do servidor.
    expect(firstColumn()).toEqual(['DEM-2026/0002', 'DEM-2026/0010', 'DEM-2026/0001']);
    await user.click(screen.getByRole('button', { name: /Título/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'titulo', direction: 'desc' });
  });

  it('usa render personalizado da coluna', () => {
    const custom = [
      { key: 'titulo', header: 'Título', render: (r) => <strong>{r.titulo}!</strong> },
    ];
    render(<DataTable columns={custom} rows={rows.slice(0, 1)} />);
    expect(screen.getByText('Queimada em área rural!').tagName).toBe('STRONG');
  });

  it('exibe estado de carregamento', () => {
    render(<DataTable columns={columns} rows={[]} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('exibe estado vazio', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="Ajuste os filtros." />);
    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
    expect(screen.getByText('Ajuste os filtros.')).toBeInTheDocument();
  });

  it('exibe erro com opção de tentar novamente', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <DataTable columns={columns} rows={[]} error={new Error('Falha na API')} onRetry={onRetry} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Falha na API');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('pagina chamando onPageChange com página 0-based', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        pagination={{ page: 0, totalPages: 3, totalElements: 25, onPageChange }}
      />,
    );
    expect(screen.getByText(/Página 1 de 3/)).toHaveTextContent('25 registro(s)');
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });
});
