import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

const MODO = 'Modo demonstrativo — sem IA generativa';

function abrir() {
  return render(
    <MemoryRouter initialEntries={['/docia/assistente']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Assistente DocIA', () => {
  beforeEach(() => iniciarSessao());

  it('envia a pergunta, mostra modo e referências com link', async () => {
    const user = userEvent.setup();
    let corpo;
    server.use(
      http.post('/api/docia/perguntas', async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({
          resposta: 'A vistoria constatou irregularidades.',
          modo: MODO,
          referencias: [{ documentoId: 7, titulo: 'Laudo fictício', trecho: 'Trecho citado.' }],
        });
      }),
    );
    abrir();
    await user.click(await screen.findByRole('button', { name: /vistoria/i }));
    expect(await screen.findByText('A vistoria constatou irregularidades.')).toBeInTheDocument();
    expect(corpo.pergunta).toMatch(/vistoria/i);
    expect(screen.getByTestId('modo-resposta')).toHaveTextContent(MODO);
    expect(screen.getByRole('link', { name: 'Laudo fictício' })).toHaveAttribute(
      'href',
      '/docia/documentos/7',
    );
    expect(screen.getByText('Trecho citado.')).toBeInTheDocument();
  });

  it('exibe "não há informação suficiente" sem referências', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/docia/perguntas', () =>
        HttpResponse.json({
          resposta: 'Não há informação suficiente nos documentos.',
          modo: MODO,
          referencias: [],
        }),
      ),
    );
    abrir();
    await user.type(await screen.findByLabelText('Sua pergunta'), 'algo?');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    expect(await screen.findByText(/Não há informação suficiente/)).toBeInTheDocument();
    expect(screen.getByTestId('modo-resposta')).toHaveTextContent(MODO);
    expect(screen.queryByText('Referências')).not.toBeInTheDocument();
  });

  it('mostra erro da API', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/docia/perguntas', () =>
        HttpResponse.json({ message: 'Falha' }, { status: 500 }),
      ),
    );
    abrir();
    await user.type(await screen.findByLabelText('Sua pergunta'), 'oi');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
