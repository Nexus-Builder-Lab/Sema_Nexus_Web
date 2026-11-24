import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import { montarCampos } from './comparacaoCampos.js';

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

const detalhes = () =>
  http.get('/api/documentos/:id', ({ params }) =>
    HttpResponse.json({
      id: Number(params.id),
      titulo: `Doc ${params.id}`,
      textoExtraido:
        params.id === '1'
          ? 'Interessado: Frigorífico X\nSetor: SULIC\nSó em A: sim'
          : 'Interessado: Frigorífico X\nSetor: GAB',
    }),
  );

const resposta = {
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
};

function abrir() {
  return render(
    <MemoryRouter initialEntries={['/docia/comparacao']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Comparação documental', () => {
  beforeEach(() => iniciarSessao());

  it('compara automaticamente e exibe KPIs, campos, diff e aviso', async () => {
    let corpo;
    server.use(
      lista(),
      detalhes(),
      http.post('/api/documentos/comparacao', async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json(resposta);
      }),
    );
    abrir();
    expect(await screen.findByText(/não é inteligência artificial/i)).toBeInTheDocument();
    const res = await screen.findByTestId('resultado');
    expect(corpo).toEqual({ aId: 1, bId: 2 });
    // cadastro: 1 igual, 1 divergente; texto: Interessado igual, Setor divergente, "Só em A" ausente
    expect(within(res).getByText('Similaridade textual')).toBeInTheDocument();
    expect(within(res).getByText('82,5%')).toBeInTheDocument();
    expect(within(res).getAllByText('Coincidente')).toHaveLength(2);
    expect(within(res).getAllByText('Divergente')).toHaveLength(2);
    expect(within(res).getAllByText('Presente em um só')).toHaveLength(1);
    expect(within(res).getByText('Interessado')).toBeInTheDocument();
    expect(within(res).getAllByTestId('diff-removido')).toHaveLength(1);
    expect(within(res).getAllByTestId('diff-adicionado')).toHaveLength(1);
    expect(within(res).getByText('quinze')).toBeInTheDocument();
    expect(screen.getByTestId('similaridade')).toHaveTextContent('82,5%');
  });

  it('filtra linhas iguais e inverte A e B', async () => {
    const user = userEvent.setup();
    const corpos = [];
    server.use(
      lista(),
      detalhes(),
      http.post('/api/documentos/comparacao', async ({ request }) => {
        corpos.push(await request.json());
        return HttpResponse.json(resposta);
      }),
    );
    abrir();
    const res = await screen.findByTestId('resultado');
    expect(within(res).getAllByTestId('diff-igual')).toHaveLength(1);
    await user.click(screen.getByLabelText(/apenas linhas diferentes/i));
    expect(within(res).queryByTestId('diff-igual')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /inverter/i }));
    await screen.findByTestId('resultado');
    expect(screen.getByLabelText('Documento A')).toHaveValue('2');
    expect(corpos.at(-1)).toEqual({ aId: 2, bId: 1 });
  });

  it('avisa quando os dois documentos são o mesmo', async () => {
    const user = userEvent.setup();
    server.use(
      lista(),
      detalhes(),
      http.post('/api/documentos/comparacao', () => HttpResponse.json(resposta)),
    );
    abrir();
    await user.selectOptions(await screen.findByLabelText('Documento B'), '1');
    expect(screen.getByText(/dois documentos diferentes/i)).toBeInTheDocument();
    expect(screen.queryByTestId('resultado')).not.toBeInTheDocument();
  });

  it('mostra mensagem da API quando não há texto extraído', async () => {
    server.use(
      lista(),
      detalhes(),
      http.post('/api/documentos/comparacao', () =>
        HttpResponse.json(
          {
            title: 'Requisição inválida',
            detail: 'O documento "Parecer 014/2026 v2" não possui texto extraído.',
          },
          { status: 400 },
        ),
      ),
    );
    abrir();
    expect(await screen.findByTestId('erro-comparacao')).toHaveTextContent(/texto extraído/i);
  });
});

describe('montarCampos', () => {
  it('classifica igual, divergente e ausente', () => {
    const c = montarCampos(
      [{ campo: 'Tipo', valorA: 'P', valorB: 'P', igual: true }],
      'Setor: A\nOutro: x',
      'Setor: B',
    );
    expect(c.map((x) => x.status)).toEqual(['igual', 'diferente', 'ausente']);
  });
});

describe('Explicar impacto das diferenças', () => {
  beforeEach(() => iniciarSessao());
  const base = () => [
    lista(),
    detalhes(),
    http.post('/api/documentos/comparacao', () => HttpResponse.json(resposta)),
  ];

  it('mostra tabela acessível, resumo e selo do modo (fixture dos mocks)', async () => {
    const user = userEvent.setup();
    server.use(...base());
    abrir();
    await screen.findByTestId('resultado');
    expect(screen.queryByTestId('explicacao')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /explicar impacto das diferenças/i }));
    const ex = await screen.findByTestId('explicacao');
    expect(within(ex).getByTestId('explicacao-modo')).toHaveTextContent(/demonstrativo/i);
    expect(within(ex).getByTestId('explicacao-resumo')).toHaveTextContent(/150 ha/);
    const tabela = within(ex).getByRole('table');
    expect(within(tabela).getByText(/grandezas que mudaram/i)).toBeInTheDocument();
    expect(within(tabela).getAllByRole('columnheader')).toHaveLength(7);
    expect(within(tabela).getAllByText('Alterado')).toHaveLength(2);
    expect(within(tabela).getByText('Removido')).toBeInTheDocument();
    expect(within(tabela).getByText('+25%')).toBeInTheDocument();
    expect(within(tabela).getByText('+30')).toBeInTheDocument();
  });

  it('mostra o selo LOCAL com o modelo e o estado de carregamento', async () => {
    const user = userEvent.setup();
    let liberar;
    server.use(
      ...base(),
      http.post('/api/docia/comparacao/explicar', async () => {
        await new Promise((r) => {
          liberar = r;
        });
        return HttpResponse.json({
          modo: 'LOCAL',
          modelo: 'qwen3:4b-instruct',
          resumoGeradoPorIa: true,
          resumo: 'Resumo.',
          grandezas: [],
          grandezasIguais: 0,
        });
      }),
    );
    abrir();
    await screen.findByTestId('resultado');
    await user.click(screen.getByRole('button', { name: /explicar impacto/i }));
    expect(await screen.findByText(/explicando as diferenças/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explicar impacto/i })).toBeDisabled();
    liberar();
    expect(await screen.findByTestId('explicacao-modo')).toHaveTextContent(
      'IA local · qwen3:4b-instruct',
    );
    expect(screen.getByText(/nenhuma grandeza mudou/i)).toBeInTheDocument();
  });

  it.each([
    [400, 'Documento sem texto extraído.'],
    [404, 'Documento inexistente.'],
  ])('mostra a mensagem da API no erro %i', async (status, detail) => {
    const user = userEvent.setup();
    server.use(
      ...base(),
      http.post('/api/docia/comparacao/explicar', () =>
        HttpResponse.json({ title: 'Erro', detail }, { status }),
      ),
    );
    abrir();
    await screen.findByTestId('resultado');
    await user.click(screen.getByRole('button', { name: /explicar impacto/i }));
    expect(await screen.findByTestId('erro-explicacao')).toHaveTextContent(detail);
  });
});
