import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

const lista = () =>
  http.get('/api/documentos', () =>
    HttpResponse.json({
      content: [
        { id: 1, titulo: 'Parecer 014/2026 v1' },
        { id: 2, titulo: 'Parecer 014/2026 v2' },
      ],
      page: 0,
      size: 100,
      totalElements: 2,
      totalPages: 1,
    }),
  );

function abrir() {
  return render(
    <MemoryRouter initialEntries={['/docia/comparacao']}>
      <App />
    </MemoryRouter>,
  );
}

async function selecionar(user) {
  await user.selectOptions(await screen.findByLabelText('Documento A'), '1');
  await user.selectOptions(screen.getByLabelText('Documento B'), '2');
}

describe('Comparação documental', () => {
  beforeEach(() => iniciarSessao());

  it('compara e exibe metadados, diff, termos e aviso', async () => {
    const user = userEvent.setup();
    let corpo;
    server.use(
      lista(),
      http.post('/api/documentos/comparacao', async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({
          aviso: 'x',
          geradoPorIa: false,
          a: { id: 1, titulo: 'Parecer 014/2026 v1' },
          b: { id: 2, titulo: 'Parecer 014/2026 v2' },
          metadados: [
            { campo: 'Tipo', valorA: 'Parecer', valorB: 'Parecer', igual: true },
            { campo: 'Versão', valorA: '1', valorB: '2', igual: false },
          ],
          similaridade: 82.5,
          similaridadeTermos: 70,
          diffLinhas: [
            { tipo: 'IGUAL', texto: 'Linha comum' },
            { tipo: 'REMOVIDO', texto: 'Prazo de 10 dias' },
            { tipo: 'ADICIONADO', texto: 'Prazo de 15 dias' },
          ],
          diffPalavras: [],
          trechosSemelhantes: [{ trechoA: 'trecho a', trechoB: 'trecho b', similaridade: 90 }],
          termosExclusivosA: ['dez'],
          termosExclusivosB: ['quinze'],
          truncado: false,
        });
      }),
    );
    abrir();
    expect(await screen.findByText(/não é inteligência artificial/i)).toBeInTheDocument();
    await selecionar(user);
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    const res = await screen.findByTestId('resultado');
    expect(corpo).toEqual({ aId: 1, bId: 2 });
    expect(within(res).getByText('Diferente')).toBeInTheDocument();
    expect(within(res).getByText('Igual')).toBeInTheDocument();
    expect(within(res).getAllByTestId('diff-removido')).toHaveLength(1);
    expect(within(res).getAllByTestId('diff-adicionado')).toHaveLength(1);
    expect(within(res).getByText('quinze')).toBeInTheDocument();
    expect(within(res).getByText('trecho a')).toBeInTheDocument();
    expect(screen.getByTestId('similaridade')).toHaveTextContent('82,5%');
  });

  it('impede comparar o mesmo documento', async () => {
    const user = userEvent.setup();
    server.use(lista());
    abrir();
    await user.selectOptions(await screen.findByLabelText('Documento A'), '1');
    await user.selectOptions(screen.getByLabelText('Documento B'), '1');
    expect(screen.getByRole('button', { name: 'Comparar' })).toBeDisabled();
    expect(screen.getByText(/dois documentos diferentes/i)).toBeInTheDocument();
  });

  it('mostra mensagem da API quando não há texto extraído', async () => {
    const user = userEvent.setup();
    server.use(
      lista(),
      http.post('/api/documentos/comparacao', () =>
        HttpResponse.json(
          { title: 'Requisição inválida', detail: 'O documento "Parecer 014/2026 v2" não possui texto extraído.' },
          { status: 400 },
        ),
      ),
    );
    abrir();
    await selecionar(user);
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(await screen.findByTestId('erro-comparacao')).toHaveTextContent(/texto extraído/i);
  });
});
