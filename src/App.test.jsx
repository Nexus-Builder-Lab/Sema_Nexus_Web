import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import { iniciarSessao } from './test/auth.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const BANNER = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';

describe('App e layout', () => {
  beforeEach(() => iniciarSessao());

  it('exibe a página inicial dentro do layout', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'SEMA NEXUS' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Menu principal' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it.each(['/', '/flux/demandas', '/intelligence', '/docia/documentos', '/rota-inexistente'])(
    'mostra a faixa demonstrativa em %s',
    (path) => {
      renderAt(path);
      expect(screen.getByRole('note', { name: /ambiente demonstrativo/i })).toHaveTextContent(
        BANNER,
      );
    },
  );

  it('exibe página não encontrada para rota inexistente', () => {
    renderAt('/rota-inexistente');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
  });

  it('lista os módulos no menu e marca o item ativo', () => {
    renderAt('/flux/demandas');
    const menu = screen.getByRole('navigation', { name: 'Módulos' });
    for (const grupo of [
      'Visão geral',
      'SEMA Intelligence',
      'SEMA Flux',
      'SEMA DocIA',
      'Administração',
    ]) {
      expect(within(menu).getByText(grupo)).toBeInTheDocument();
    }
    expect(within(menu).getByRole('link', { name: 'Demandas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('mostra subtítulos dos módulos, pesquisa e menu do usuário na topbar', async () => {
    renderAt('/');
    const menu = screen.getByRole('navigation', { name: 'Módulos' });
    expect(within(menu).getByText('Gestão e análise ambiental')).toBeInTheDocument();
    expect(within(menu).getByText('Processos e demandas')).toBeInTheDocument();
    expect(within(menu).getByText('Documentos e processos')).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu do usuário' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('mostra a trilha de navegação da página atual', () => {
    renderAt('/intelligence/inteligencia-ambiental');
    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    expect(within(trail).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(within(trail).getByText('SEMA Intelligence')).toBeInTheDocument();
    expect(within(trail).getByText('Inteligência ambiental')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('recolhe e expande o menu lateral', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/');
    await user.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(container.querySelector('.nx-app')).toHaveClass('is-collapsed');
    await user.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(container.querySelector('.nx-app')).not.toHaveClass('is-collapsed');
  });

  it('abre o menu no celular e fecha com Esc', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/');
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(container.querySelector('.nx-app')).toHaveClass('is-mobile-open');
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await user.keyboard('{Escape}');
    expect(container.querySelector('.nx-app')).not.toHaveClass('is-mobile-open');
  });

  it('exibe o sino de notificações habilitado para o usuário autenticado', async () => {
    renderAt('/');
    expect(await screen.findByRole('button', { name: /^Notificações/ })).toBeEnabled();
  });
});
