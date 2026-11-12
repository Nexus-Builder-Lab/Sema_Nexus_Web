import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { server } from '../mocks/server.js';
import GlobalSearch from './GlobalSearch.jsx';

const pagina = (content) => ({
  content,
  page: 0,
  size: 5,
  totalElements: content.length,
  totalPages: 1,
});

function Local() {
  return <span data-testid="local">{useLocation().pathname}</span>;
}

function montar(perfil) {
  server.use(
    http.get('/api/demandas', () =>
      HttpResponse.json(
        pagina([
          {
            id: 7,
            numero: 'DEM-2026/0007',
            titulo: 'Desmatamento no Rio',
            status: 'EM_TRIAGEM',
            municipio: { nome: 'Sinop' },
          },
        ]),
      ),
    ),
    http.get('/api/documentos', () =>
      HttpResponse.json(
        pagina([{ id: 3, titulo: 'Parecer Rio', categoria: 'PARECER', nomeArquivo: 'p.pdf' }]),
      ),
    ),
    http.get('/api/usuarios', () =>
      HttpResponse.json(pagina([{ id: 9, nome: 'Rita Rio', email: 'rita@x.org' }])),
    ),
  );
  render(
    <MemoryRouter>
      <GlobalSearch user={{ perfil }} />
      <Local />
    </MemoryRouter>,
  );
}

describe('GlobalSearch', () => {
  it('Ctrl+K foca o campo e agrupa resultados; setas e Enter navegam', async () => {
    const user = userEvent.setup();
    montar('ADMIN');
    await user.keyboard('{Control>}k{/Control}');
    const campo = screen.getByRole('combobox', { name: 'Pesquisa global' });
    expect(campo).toHaveFocus();
    await user.type(campo, 'rio');
    expect(await screen.findByText('DEM-2026/0007 — Desmatamento no Rio')).toBeInTheDocument();
    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('Rita Rio')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(screen.getByTestId('local')).toHaveTextContent('/docia/documentos/3');
  });

  it('não busca usuários para perfis não administradores e mostra estado vazio', async () => {
    const user = userEvent.setup();
    montar('FISCAL');
    await user.type(screen.getByRole('combobox'), 'rio');
    await screen.findByText('Parecer Rio');
    expect(screen.queryByText('Rita Rio')).not.toBeInTheDocument();
    server.use(
      http.get('/api/demandas', () => HttpResponse.json(pagina([]))),
      http.get('/api/documentos', () => HttpResponse.json(pagina([]))),
    );
    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), 'zzz');
    expect(await screen.findByText(/Nenhum resultado/)).toBeInTheDocument();
  });
});
