import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App.jsx';
import { iniciarSessao, USUARIO_ADMIN } from '../../../test/auth.js';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('Sino de notificações', () => {
  it('mostra o contador, lista e atualiza o contador após marcar como lida', async () => {
    iniciarSessao();
    const user = userEvent.setup();
    renderAt('/');
    const sino = await screen.findByRole('button', { name: 'Notificações (2 não lidas)' });
    expect(screen.getByTestId('contador-notificacoes')).toHaveTextContent('2');

    await user.click(sino);
    const lista = await screen.findByRole('region', { name: 'Lista de notificações' });
    expect(await within(lista).findByText('Demanda distribuída')).toBeInTheDocument();

    await user.click(
      within(lista).getByRole('button', { name: 'Marcar como lida: Demanda distribuída' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Notificações (1 não lidas)' }),
    ).toBeInTheDocument();
    expect(
      within(lista).queryByRole('button', { name: 'Marcar como lida: Demanda distribuída' }),
    ).not.toBeInTheDocument();
  });
});

describe('Auditoria', () => {
  it('nega acesso a perfis diferentes de ADMIN', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'FISCAL' });
    renderAt('/admin/auditoria');
    expect(
      await screen.findByRole('heading', { name: /acesso negado|sem permissão/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('lista registros e filtra por entidade e ação', async () => {
    iniciarSessao();
    const user = userEvent.setup();
    renderAt('/admin/auditoria');
    await screen.findByRole('table', { name: /registros de auditoria/i });
    expect(screen.getAllByRole('row').length).toBe(5);

    await user.type(screen.getByLabelText('Entidade'), 'demanda');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(screen.getAllByRole('row').length).toBe(3));
    expect(screen.getByText('DISTRIBUIR')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Ação'), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText('Nenhum registro encontrado')).toBeInTheDocument();
  });
});
