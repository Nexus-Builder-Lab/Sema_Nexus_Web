import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { handlersSse, respostaSse } from '../../mocks/handlers.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import { rotuloModo } from './agenteTriagem.js';

// Com as demandas do mock: id 2 = EM_TRIAGEM.
function abrirTriagem() {
  render(
    <MemoryRouter initialEntries={['/flux/demandas/2']}>
      <App />
    </MemoryRouter>,
  );
}

async function abrirModal(user, nome = 'Concluir triagem') {
  abrirTriagem();
  await user.click(await screen.findByRole('button', { name: nome }));
  return screen.findByRole('dialog', { name: nome });
}

describe('Agente de Triagem no modal de triagem', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('pede a sugestão, mostra o modelo e o que consultou e aplica no formulário', async () => {
    const user = userEvent.setup();
    const modal = await abrirModal(user);

    await user.click(within(modal).getByRole('button', { name: 'Sugerir com o agente' }));

    expect(await within(modal).findByTestId('agente-modo')).toHaveTextContent(
      'IA local · qwen3:4b-instruct',
    );
    expect(within(modal).getByText(/NR-CBA — Núcleo Regional de Cuiabá/)).toBeInTheDocument();
    expect(within(modal).getByText('Como o agente chegou à sugestão')).toBeInTheDocument();
    expect(within(modal).getByText(/Consultou o INPE no município: 42 foco/)).toBeInTheDocument();
    expect(
      within(modal).getByText('Sugestão de IA — revise antes de confirmar.'),
    ).toBeInTheDocument();

    await user.click(within(modal).getByRole('button', { name: 'Aplicar sugestão' }));

    expect(within(modal).getByLabelText('Categoria *')).toHaveValue('QUEIMADA_INCENDIO');
    expect(within(modal).getByLabelText('Prioridade *')).toHaveValue('ALTA');
    expect(within(modal).getByLabelText('Justificativa *').value).toMatch(
      /Relato de queimada.*Núcleo regional sugerido: NR-CBA\./,
    );
    expect(within(modal).getByText(/Sugestão aplicada ao formulário/)).toBeInTheDocument();
  });

  it('com decisão diferente, avisa e aplica só a justificativa', async () => {
    const user = userEvent.setup();
    const modal = await abrirModal(user, 'Solicitar complementação');

    await user.click(within(modal).getByRole('button', { name: 'Sugerir com o agente' }));
    expect(await within(modal).findByRole('note')).toHaveTextContent(/classificar a demanda/i);

    await user.click(within(modal).getByRole('button', { name: 'Aplicar sugestão' }));
    expect(within(modal).getByLabelText('Justificativa *').value).toMatch(/Relato de queimada/);
    expect(within(modal).queryByLabelText('Categoria *')).not.toBeInTheDocument();
  });

  it('mostra erro da API sem travar o modal', async () => {
    server.use(
      http.post('/api/demandas/:id/triagem/sugestao', () =>
        HttpResponse.json(
          {
            title: 'Conflito',
            status: 409,
            detail: 'A sugestão de triagem só se aplica a demandas Pendentes ou Em triagem.',
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const user = userEvent.setup();
    const modal = await abrirModal(user);

    await user.click(within(modal).getByRole('button', { name: 'Sugerir com o agente' }));

    expect(await within(modal).findByRole('alert')).toHaveTextContent(/Pendentes ou Em triagem/);
    expect(within(modal).getByRole('button', { name: 'Sugerir com o agente' })).toBeEnabled();
  });

  it('identifica sempre o motor da sugestão', () => {
    expect(rotuloModo({ modo: 'LOCAL', modelo: 'qwen3:4b-instruct' })).toBe(
      'IA local · qwen3:4b-instruct',
    );
    expect(rotuloModo({ modo: 'CLAUDE', modelo: 'claude-haiku-5-5' })).toBe(
      'Claude · claude-haiku-5-5',
    );
    expect(rotuloModo({ modo: 'DEMONSTRATIVO', modelo: null })).toBe(
      'Regras locais (sem IA generativa)',
    );
  });
});

describe('Agente de Triagem por streaming (SSE)', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
    server.use(...handlersSse);
  });

  it('mostra o progresso ao vivo e o aviso de modo demonstrativo, depois a sugestão', async () => {
    const user = userEvent.setup();
    let liberar;
    const espera = new Promise((r) => {
      liberar = r;
    });
    server.use(
      http.post('/api/demandas/:id/triagem/sugestao/stream', async () => {
        const enc = new TextEncoder();
        return new HttpResponse(
          new ReadableStream({
            async start(c) {
              const e = (n, d) =>
                c.enqueue(enc.encode(`event: ${n}\ndata: ${JSON.stringify(d)}\n\n`));
              e('inicio', { agente: 'triagem' });
              e('ferramenta_iniciada', { ferramenta: 'obter_demanda', ordem: 1 });
              await espera;
              e('fallback_demonstrativo', { motivo: 'IA indisponível' });
              e('concluido', {
                modo: 'DEMONSTRATIVO',
                decisao: 'CLASSIFICAR',
                categoria: 'QUEIMADA_INCENDIO',
                prioridade: 'ALTA',
                justificativa: 'Texto.',
                duplicatas: [],
                evidencias: [],
                avisos: [],
              });
              c.close();
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
    );
    const modal = await abrirModal(user);
    await user.click(within(modal).getByRole('button', { name: 'Sugerir com o agente' }));

    expect(await within(modal).findByText(/Lendo os dados da demanda…/)).toBeInTheDocument();
    expect(within(modal).getByTestId('progresso-agente')).toHaveAttribute('aria-live', 'polite');
    liberar();
    expect(await within(modal).findByTestId('aviso-fallback')).toHaveTextContent('IA indisponível');
    expect(within(modal).getByRole('button', { name: 'Aplicar sugestão' })).toBeInTheDocument();
  });

  it('evento erro mostra o estado de erro', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/demandas/:id/triagem/sugestao/stream', () =>
        respostaSse([['erro', { mensagem: 'Falha no agente (ref. ERR-9).', referencia: 'ERR-9' }]]),
      ),
    );
    const modal = await abrirModal(user);
    await user.click(within(modal).getByRole('button', { name: 'Sugerir com o agente' }));
    expect(await within(modal).findByRole('alert')).toHaveTextContent('Falha no agente');
  });

  it('cai no endpoint JSON se o stream não existe (404)', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(
        '/api/demandas/:id/triagem/sugestao/stream',
        () => new HttpResponse('Not Found', { status: 404 }),
      ),
    );
    const modal = await abrirModal(user);
    await user.click(within(modal).getByRole('button', { name: 'Sugerir com o agente' }));
    expect(await within(modal).findByTestId('agente-modo')).toBeInTheDocument();
  });
});
