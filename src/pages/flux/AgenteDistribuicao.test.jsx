import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../test/auth.js';

// Com as demandas do mock: id 3 = AGUARDANDO_DISTRIBUICAO.
async function abrirModal(user) {
  render(
    <MemoryRouter initialEntries={['/flux/demandas/3']}>
      <App />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Distribuir' }));
  return screen.findByRole('dialog');
}

const problema = (status, detail) =>
  HttpResponse.json(
    { title: 'Erro', status, detail },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );

describe('Agente de Distribuição no modal de distribuição', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('sugere, mostra modo e passos e aplica só equipe, fiscal e prazo sem enviar', async () => {
    let enviou = false;
    server.use(
      http.post('/api/demandas/:id/distribuicao', () => {
        enviou = true;
        return problema(500, 'não deveria enviar');
      }),
    );
    const user = userEvent.setup();
    const modal = await abrirModal(user);

    await user.click(await within(modal).findByRole('button', { name: 'Sugerir com o agente' }));
    expect(await within(modal).findByTestId('agente-modo')).toHaveTextContent(
      'IA local · qwen3:4b-instruct',
    );
    expect(within(modal).getByText(/menor carga no núcleo regional/)).toBeInTheDocument();
    expect(within(modal).getByText(/tempo médio histórico/)).toBeInTheDocument();

    await user.click(within(modal).getByRole('button', { name: 'Aplicar sugestão' }));

    expect(within(modal).getByLabelText(/^Equipe/)).toHaveValue('1');
    await waitFor(() => expect(within(modal).getByLabelText(/^Fiscal/)).toHaveValue('3'));
    expect(within(modal).getByLabelText(/^Prazo/).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(within(modal).getByText(/Sugestão aplicada ao formulário/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(enviou).toBe(false);
  });

  it('identifica o modo demonstrativo e mostra avisos', async () => {
    server.use(
      http.post('/api/demandas/:id/distribuicao/sugestao', () =>
        HttpResponse.json({
          modo: 'DEMONSTRATIVO',
          modelo: null,
          equipe: { id: 2, nome: 'Equipe Bravo (demonstração)', setorSigla: null },
          fiscal: {
            id: 5,
            nome: 'Fiscal Demonstrativo 3',
            ativas: 0,
            atrasadas: 0,
            proximasDoVencimento: 0,
          },
          prazo: '2099-01-10',
          justificativa: 'Regras locais.',
          passos: ['Ampliou a busca a todos os núcleos.'],
          avisos: ['IA indisponível: usando regras locais.'],
        }),
      ),
    );
    const user = userEvent.setup();
    const modal = await abrirModal(user);
    await user.click(await within(modal).findByRole('button', { name: 'Sugerir com o agente' }));
    expect(await within(modal).findByTestId('agente-modo')).toHaveTextContent(
      'Regras locais (sem IA generativa)',
    );
    expect(within(modal).getByText('IA indisponível: usando regras locais.')).toBeInTheDocument();
    expect(within(modal).getByText('10/01/2099')).toBeInTheDocument();
  });

  it.each([
    [409, 'Demanda não está aguardando distribuição.'],
    [403, 'Acesso negado ao agente.'],
    [404, 'Demanda inexistente.'],
  ])('mostra o erro %s sem travar o modal', async (status, detail) => {
    server.use(
      http.post('/api/demandas/:id/distribuicao/sugestao', () => problema(status, detail)),
    );
    const user = userEvent.setup();
    const modal = await abrirModal(user);
    await user.click(await within(modal).findByRole('button', { name: 'Sugerir com o agente' }));
    expect(await within(modal).findByRole('alert')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Sugerir com o agente' })).toBeEnabled();
  });

  it('não mostra o agente para quem não distribui', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'ANALISTA' });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/flux/demandas/3']}>
        <App />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: 'Distribuir' })).not.toBeInTheDocument();
    expect(user).toBeDefined();
  });

  it('descarta resposta atrasada depois de fechar o modal', async () => {
    let liberar;
    const espera = new Promise((r) => {
      liberar = r;
    });
    server.use(
      http.post('/api/demandas/:id/distribuicao/sugestao', async () => {
        await espera;
        return problema(409, 'tarde demais');
      }),
    );
    const user = userEvent.setup();
    const modal = await abrirModal(user);
    await user.click(await within(modal).findByRole('button', { name: 'Sugerir com o agente' }));
    expect(await within(modal).findByRole('status')).toHaveTextContent(/consultando/);
    await user.click(within(modal).getByRole('button', { name: 'Cancelar' }));
    liberar();
    await user.click(await screen.findByRole('button', { name: 'Distribuir' }));
    const novo = await screen.findByRole('dialog');
    expect(await within(novo).findByRole('button', { name: 'Sugerir com o agente' })).toBeEnabled();
    expect(within(novo).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('limpa o fiscal sugerido ausente da equipe e avisa', async () => {
    server.use(
      http.post('/api/demandas/:id/distribuicao/sugestao', () =>
        HttpResponse.json({
          modo: 'DEMONSTRATIVO',
          modelo: null,
          equipe: { id: 2, nome: 'Equipe Bravo (demonstração)', setorSigla: null },
          fiscal: {
            id: 3,
            nome: 'Fora da equipe',
            ativas: 0,
            atrasadas: 0,
            proximasDoVencimento: 0,
          },
          prazo: '2099-01-10',
          justificativa: 'x',
          passos: [],
          avisos: [],
        }),
      ),
    );
    const user = userEvent.setup();
    const modal = await abrirModal(user);
    await user.click(await within(modal).findByRole('button', { name: 'Sugerir com o agente' }));
    await user.click(await within(modal).findByRole('button', { name: 'Aplicar sugestão' }));
    expect(
      await within(modal).findByText(/fiscal sugerido não está disponível nesta equipe/),
    ).toBeInTheDocument();
    expect(within(modal).getByLabelText(/^Fiscal/)).toHaveValue('');
  });
});
