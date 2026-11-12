import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Breadcrumbs from './Breadcrumbs.jsx';
import { subCrumb } from './navigation.js';

describe('Breadcrumbs', () => {
  it('rotula rotas aninhadas', () => {
    expect(subCrumb('/flux/demandas', '/flux/demandas')).toBeNull();
    expect(subCrumb('/flux/demandas', '/flux/demandas/nova')).toBe('Nova demanda');
    expect(subCrumb('/flux/demandas', '/flux/demandas/5')).toBe('Detalhes');
    expect(subCrumb('/flux/demandas', '/flux/demandas/5/editar')).toBe('Editar');
    expect(subCrumb('/docia/documentos', '/docia/documentos/novo')).toBe('Novo documento');
  });

  it('mostra a lista como link e o trecho final como página atual', () => {
    render(
      <MemoryRouter initialEntries={['/flux/demandas/5/editar']}>
        <Breadcrumbs />
      </MemoryRouter>,
    );
    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    expect(within(trail).getByRole('link', { name: 'Demandas' })).toHaveAttribute(
      'href',
      '/flux/demandas',
    );
    expect(within(trail).getByText('Editar')).toHaveAttribute('aria-current', 'page');
  });
});
