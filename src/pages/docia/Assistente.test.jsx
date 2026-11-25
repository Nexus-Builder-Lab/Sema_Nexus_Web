import { render, screen, waitFor } from '@testing-library/react';
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
    // Sem aderência informada (ex.: provider externo), nem selo nem explicação.
    expect(screen.queryByTestId('aderencia-textual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('explicacao-aderencia')).not.toBeInTheDocument();
  });

  it('rotula a aderência textual e explica que não é probabilidade de acerto', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/docia/perguntas', () =>
        HttpResponse.json({
          resposta: 'O laudo registra 210 hectares.',
          modo: MODO,
          referencias: [
            {
              documentoId: 7,
              titulo: 'Laudo fictício',
              trecho: 'Área de 210 hectares.',
              aderenciaTextual: 'alta',
            },
            {
              documentoId: 8,
              titulo: 'Relatório fictício',
              trecho: 'Outra área.',
              aderenciaTextual: 'média',
            },
          ],
        }),
      ),
    );
    abrir();
    await user.type(await screen.findByLabelText('Sua pergunta'), 'Qual a área?');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    const selos = await screen.findAllByTestId('aderencia-textual');
    expect(selos.map((s) => s.textContent)).toEqual([
      'Aderência textual: alta',
      'Aderência textual: média',
    ]);
    const explicacao = screen.getByTestId('explicacao-aderencia');
    expect(explicacao).toHaveTextContent(/não é a probabilidade de a resposta estar correta/i);
    // Leitores de tela associam o selo à explicação.
    expect(selos[0]).toHaveAttribute('aria-describedby', explicacao.id);
  });

  it('mostra o modo de recuperação com explicação associada e similaridade só quando informada', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/docia/perguntas', () =>
        HttpResponse.json({
          resposta: 'O laudo registra 210 hectares.',
          modo: MODO,
          recuperacao: 'HIBRIDA',
          referencias: [
            {
              documentoId: 7,
              titulo: 'Laudo fictício',
              trecho: 'Área de 210 hectares.',
              aderenciaTextual: 'alta',
              similaridadeSemantica: 0.712,
            },
            {
              documentoId: 8,
              titulo: 'Relatório fictício',
              trecho: 'Outra área.',
              aderenciaTextual: null,
              similaridadeSemantica: null,
            },
          ],
        }),
      ),
    );
    abrir();
    await user.type(await screen.findByLabelText('Sua pergunta'), 'Qual a área?');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    const selo = await screen.findByTestId('recuperacao');
    expect(selo).toHaveTextContent('Busca: híbrida (palavras + semântica)');
    const explicacao = document.getElementById(selo.getAttribute('aria-describedby'));
    expect(explicacao).toHaveTextContent(/NÃO são a probabilidade de a resposta estar correta/);
    const similaridade = screen.getAllByTestId('similaridade-semantica');
    expect(similaridade).toHaveLength(1);
    expect(similaridade[0]).toHaveTextContent('Similaridade semântica: 0,71');
    expect(similaridade[0]).toHaveAttribute(
      'aria-describedby',
      screen.getByTestId('explicacao-aderencia').id,
    );
    expect(screen.getByTestId('explicacao-aderencia')).toHaveTextContent(/Similaridade semântica/);
  });

  it('mostra "Busca: por palavras" e nenhuma similaridade quando a API não as informa', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/docia/perguntas', () =>
        HttpResponse.json({
          resposta: 'Não há informação suficiente nos documentos.',
          modo: MODO,
          recuperacao: 'LEXICAL',
          referencias: [],
        }),
      ),
    );
    abrir();
    await user.type(await screen.findByLabelText('Sua pergunta'), 'algo?');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    expect(await screen.findByTestId('recuperacao')).toHaveTextContent('Busca: por palavras');
    expect(screen.queryByTestId('similaridade-semantica')).not.toBeInTheDocument();
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
    expect(screen.getByLabelText('Sua pergunta')).toHaveValue('oi');
  });

  it('mostra banner, painel lateral, histórico e limpa a conversa', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/docia/perguntas', () =>
        HttpResponse.json({ resposta: 'Resposta X.', modo: MODO, referencias: [] }),
      ),
    );
    abrir();
    expect(await screen.findByText(/Modo demonstração/)).toBeInTheDocument();
    expect(screen.getByText('Sugestões de perguntas')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma pergunta nesta sessão.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Sua pergunta'), 'teste?');
    await user.click(screen.getByRole('button', { name: /Perguntar/ }));
    expect(await screen.findByText('Resposta X.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'teste?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Nova conversa/ }));
    expect(screen.queryByText('Resposta X.')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma pergunta nesta sessão.')).toBeInTheDocument();
  });

  it('com o Agente DocIA, identifica a IA local, o modelo e os passos do agente', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/agentes/status', () =>
        HttpResponse.json({
          modo: 'LOCAL',
          descricao: 'Agentes com IA local',
          agentes: [{ id: 'docia', nome: 'Assistente DocIA', modelo: 'qwen3:4b-instruct' }],
        }),
      ),
      http.post('/api/docia/perguntas', () =>
        HttpResponse.json({
          resposta: 'O parecer conclui pela recomposição da vegetação.',
          modo: 'Agente DocIA — IA local',
          referencias: [{ documentoId: 7, titulo: 'Parecer fictício', trecho: 'Trecho real.' }],
          agente: 'LOCAL',
          modelo: 'qwen3:4b-instruct',
          passos: ['Buscou "parecer": 1 documento(s).', 'Leu "Parecer fictício".'],
        }),
      ),
    );
    abrir();

    expect(await screen.findByText(/Agente DocIA com IA local/)).toBeInTheDocument();
    expect(
      screen.getByText(/sem custo e sem enviar dados para fora do servidor/),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'O que o parecer concluiu?');
    await user.keyboard('{Enter}');

    expect(await screen.findByTestId('agente-resposta')).toHaveTextContent(
      'IA local · qwen3:4b-instruct',
    );
    expect(screen.getByText('Como o agente chegou à resposta')).toBeInTheDocument();
    expect(screen.getByText('Leu "Parecer fictício".')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parecer fictício' })).toBeInTheDocument();
  });

  it('sem IA disponível mantém o aviso de modo demonstração', async () => {
    abrir();
    expect(await screen.findByText('Modo demonstração')).toBeInTheDocument();
  });
});

describe('Assistente DocIA — multi-turno', () => {
  beforeEach(() => iniciarSessao());

  it('envia os últimos 4 turnos como historico, mostra o contexto e o limpa em Nova conversa', async () => {
    const user = userEvent.setup();
    const corpos = [];
    server.use(
      http.post('/api/docia/perguntas', async ({ request }) => {
        const c = await request.json();
        corpos.push(c);
        return HttpResponse.json({
          resposta: `R${corpos.length}`,
          modo: MODO,
          referencias: [],
        });
      }),
    );
    abrir();
    const campo = await screen.findByLabelText('Sua pergunta');
    expect(screen.queryByTestId('contexto-ativo')).not.toBeInTheDocument();
    for (let i = 1; i <= 6; i += 1) {
      await user.type(campo, `P${i}`);
      await user.keyboard('{Enter}');
      expect(await screen.findByText(`R${i}`)).toBeInTheDocument();
    }
    expect(corpos[0].historico).toBeUndefined();
    expect(corpos[1].historico).toEqual([{ pergunta: 'P1', resposta: 'R1' }]);
    expect(corpos[5].historico).toHaveLength(4);
    expect(corpos[5].historico[0]).toEqual({ pergunta: 'P2', resposta: 'R2' });
    expect(corpos[5].historico[3]).toEqual({ pergunta: 'P5', resposta: 'R5' });
    expect(screen.getByTestId('contexto-ativo')).toHaveTextContent(/4 turnos anteriores/);

    await user.click(screen.getByRole('button', { name: /Nova conversa/ }));
    expect(screen.queryByTestId('contexto-ativo')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Sua pergunta'), 'P7');
    await user.keyboard('{Enter}');
    await screen.findByText('R7');
    expect(corpos[6].historico).toBeUndefined();
  });
});

describe('Assistente DocIA — robustez do contexto', () => {
  beforeEach(() => iniciarSessao());

  it('não envia turnos de abstenção e descarta resposta em voo após Nova conversa', async () => {
    const user = userEvent.setup();
    const corpos = [];
    let liberar;
    server.use(
      http.post('/api/docia/perguntas', async ({ request }) => {
        const c = await request.json();
        corpos.push(c);
        if (c.pergunta === 'P2') await new Promise((res) => (liberar = res));
        return HttpResponse.json({
          resposta:
            c.pergunta === 'P1'
              ? 'Não há informação suficiente nos documentos.'
              : `R-${c.pergunta}`,
          modo: MODO,
          referencias: [],
        });
      }),
    );
    abrir();
    const campo = await screen.findByLabelText('Sua pergunta');
    await user.type(campo, 'P1');
    await user.keyboard('{Enter}');
    await screen.findByText(/Não há informação suficiente/);
    await user.type(screen.getByLabelText('Sua pergunta'), 'P2');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(corpos).toHaveLength(2));
    expect(corpos[1].historico).toBeUndefined();
    await user.click(screen.getByRole('button', { name: /Nova conversa/ }));
    liberar();
    await user.type(screen.getByLabelText('Sua pergunta'), 'P3');
    await user.keyboard('{Enter}');
    await screen.findByText('R-P3');
    expect(screen.queryByText('R-P2')).not.toBeInTheDocument();
  });
});
