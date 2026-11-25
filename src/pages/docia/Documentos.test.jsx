import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../test/auth.js';

const DOC = (id, titulo, extra = {}) => ({
  id,
  titulo,
  categoria: 'Relatório técnico',
  tipo: 'Laudo',
  dataDocumento: '2026-11-05',
  municipio: { id: 5103403, nome: 'Cuiabá' },
  palavrasChave: ['vistoria'],
  nomeArquivo: `doc${id}.pdf`,
  mime: 'application/pdf',
  tamanho: 2048,
  ...extra,
});
const A = DOC(1, 'Relatório de vistoria fictício');
const B = DOC(2, 'Laudo ambiental fictício');

const pagina = (content) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
});

function abrir(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Biblioteca de documentos', () => {
  beforeEach(() => iniciarSessao());

  it('lista, explica a pesquisa e envia a pesquisa ranqueada e os filtros', async () => {
    const user = userEvent.setup();
    const buscas = [];
    server.use(
      http.get('/api/documentos', () => HttpResponse.json(pagina([A, B]))),
      http.get('/api/documentos/busca', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q');
        buscas.push(q);
        return HttpResponse.json({
          consulta: q,
          recuperacao: 'LEXICAL',
          resultados: [{ documento: A, trecho: 'Vistoria realizada.', aderenciaTextual: 'alta' }],
        });
      }),
    );
    abrir('/docia/documentos');
    expect(await screen.findByRole('link', { name: A.titulo })).toBeVisible();
    expect(screen.getByText(/A pesquisa procura o trecho/)).toBeVisible();
    expect(screen.queryByTestId('recuperacao')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todas (2)' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Relatório técnico (2)' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Cadastrar documento' })).toBeVisible();

    await user.type(screen.getByLabelText('Pesquisar nos documentos'), 'vistoria');
    await user.type(screen.getByLabelText('Categoria'), 'Relatório técnico');
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(buscas.at(-1)).toBe('vistoria'));
    expect(await screen.findByTestId('recuperacao')).toHaveTextContent('Busca: por palavras');
    expect(screen.getByText('Vistoria realizada.')).toBeVisible();
  });

  it('mostra estado vazio com filtro', async () => {
    server.use(
      http.get('/api/documentos/busca', () =>
        HttpResponse.json({ consulta: 'nada', recuperacao: 'LEXICAL', resultados: [] }),
      ),
    );
    abrir('/docia/documentos?q=nada');
    expect(await screen.findByText('Nenhum documento encontrado')).toBeVisible();
  });

  it('pesquisa híbrida mostra o modo, o trecho e a similaridade só quando informada', async () => {
    server.use(
      http.get('/api/documentos/busca', () =>
        HttpResponse.json({
          consulta: 'vistoria',
          recuperacao: 'HIBRIDA',
          resultados: [
            {
              documento: A,
              trecho: 'Trecho da vistoria.',
              aderenciaTextual: 'alta',
              similaridadeSemantica: 0.712,
            },
            {
              documento: B,
              trecho: 'Outro trecho.',
              aderenciaTextual: null,
              similaridadeSemantica: null,
            },
          ],
        }),
      ),
    );
    abrir('/docia/documentos?q=vistoria');
    expect(await screen.findByRole('link', { name: A.titulo })).toBeVisible();
    const selo = screen.getByTestId('recuperacao');
    expect(selo).toHaveTextContent('Busca: híbrida (palavras + semântica)');
    const explicacao = document.getElementById(selo.getAttribute('aria-describedby'));
    expect(explicacao).toHaveTextContent(/não a probabilidade de a resposta estar correta/);
    expect(screen.getByText('Trecho da vistoria.')).toBeVisible();
    expect(screen.getByTestId('aderencia-textual')).toHaveTextContent('Aderência textual: alta');
    const similaridade = screen.getAllByTestId('similaridade-semantica');
    expect(similaridade).toHaveLength(1);
    expect(similaridade[0]).toHaveTextContent('Similaridade semântica: 0,71');
    expect(similaridade[0]).toHaveAttribute('aria-describedby', explicacao.id);
  });

  it('termo de uma letra não usa a pesquisa ranqueada (mantém a listagem)', async () => {
    const chamadas = { busca: 0, lista: 0 };
    server.use(
      http.get('/api/documentos/busca', () => {
        chamadas.busca += 1;
        return HttpResponse.json({ consulta: 'a', recuperacao: 'LEXICAL', resultados: [] });
      }),
      http.get('/api/documentos', () => {
        chamadas.lista += 1;
        return HttpResponse.json(pagina([A]));
      }),
    );
    abrir('/docia/documentos?q=a');
    expect(await screen.findByRole('link', { name: A.titulo })).toBeVisible();
    expect(chamadas.lista).toBeGreaterThan(0);
    expect(chamadas.busca).toBe(0);
    expect(screen.queryByTestId('recuperacao')).not.toBeInTheDocument();
  });
});

describe('Detalhes do documento', () => {
  beforeEach(() => iniciarSessao());

  it('mostra metadados, demandas vinculadas e texto colapsável', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/documentos/1', () =>
        HttpResponse.json({
          ...A,
          descricao: 'Descrição fictícia',
          sha256: 'abc123',
          textoExtraido: 'Conteúdo extraído do PDF',
          demandas: [{ id: 3, numero: 'DEM-2026/0003', titulo: 'Demanda fictícia' }],
          responsavel: { id: 1, nome: 'Administrador Demonstrativo' },
        }),
      ),
    );
    abrir('/docia/documentos/1');
    expect(await screen.findByRole('heading', { level: 1, name: A.titulo })).toBeVisible();
    expect(screen.getByRole('link', { name: 'DEM-2026/0003' })).toHaveAttribute(
      'href',
      '/flux/demandas/3',
    );
    expect(screen.queryByText('Conteúdo extraído do PDF')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostrar texto' }));
    expect(screen.getByText('Conteúdo extraído do PDF')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Baixar arquivo' })).toBeEnabled();
  });

  it('mostra erro de documento inexistente', async () => {
    server.use(
      http.get('/api/documentos/999', () =>
        HttpResponse.json(
          { title: 'Não encontrado', detail: 'Documento inexistente.' },
          { status: 404 },
        ),
      ),
    );
    abrir('/docia/documentos/999');
    expect(await screen.findByText('Documento não encontrado')).toBeVisible();
  });
});

describe('Documentos na demanda', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao(USUARIO_ADMIN);
  });

  it('lista, vincula por busca e desvincula com confirmação', async () => {
    const user = userEvent.setup();
    let vinculados = [A];
    const chamadas = [];
    server.use(
      http.get('/api/demandas/1/documentos', () => HttpResponse.json(vinculados)),
      http.get('/api/documentos', ({ request }) => {
        chamadas.push(new URL(request.url).searchParams.get('q'));
        return HttpResponse.json(pagina([A, B]));
      }),
      http.post('/api/demandas/1/documentos', async ({ request }) => {
        const { documentoId } = await request.json();
        vinculados = [...vinculados, [A, B].find((d) => d.id === documentoId)];
        return HttpResponse.json(B, { status: 201 });
      }),
      http.delete('/api/demandas/1/documentos/:docId', ({ params }) => {
        vinculados = vinculados.filter((d) => d.id !== Number(params.docId));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    abrir('/flux/demandas/1');
    const secao = await screen.findByRole('region', { name: 'Documentos' });
    expect(await within(secao).findByRole('link', { name: A.titulo })).toBeVisible();

    await user.click(within(secao).getByRole('button', { name: 'Vincular documento' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Vincular documento existente' });
    await user.type(within(dialogo).getByLabelText('Pesquisar documento'), 'laudo');
    await user.click(within(dialogo).getByRole('button', { name: 'Buscar' }));
    expect(
      await within(dialogo).findByRole('button', { name: `Vincular ${A.titulo}` }),
    ).toBeDisabled();
    await user.click(within(dialogo).getByRole('button', { name: `Vincular ${B.titulo}` }));
    expect(chamadas).toContain('laudo');
    expect(await within(secao).findByRole('link', { name: B.titulo })).toBeVisible();

    await user.click(within(secao).getByRole('button', { name: `Desvincular ${A.titulo}` }));
    const confirmacao = await screen.findByRole('dialog', { name: 'Desvincular documento' });
    await user.click(within(confirmacao).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() =>
      expect(within(secao).queryByRole('link', { name: A.titulo })).not.toBeInTheDocument(),
    );
    expect(within(secao).getByRole('link', { name: B.titulo })).toBeVisible();
  });

  it('mostra estado vazio e o atalho de envio já vinculado', async () => {
    server.use(http.get('/api/demandas/1/documentos', () => HttpResponse.json([])));
    abrir('/flux/demandas/1');
    const secao = await screen.findByRole('region', { name: 'Documentos' });
    expect(await within(secao).findByText('Nenhum documento associado.')).toBeVisible();
    expect(within(secao).getByRole('link', { name: 'Enviar novo documento' })).toHaveAttribute(
      'href',
      '/docia/documentos/novo?demandaId=1',
    );
  });

  it('CONSULTA não vê ações de escrita', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'CONSULTA' });
    server.use(http.get('/api/demandas/1/documentos', () => HttpResponse.json([A])));
    abrir('/flux/demandas/1');
    const secao = await screen.findByRole('region', { name: 'Documentos' });
    expect(await within(secao).findByRole('link', { name: A.titulo })).toBeVisible();
    expect(within(secao).queryByRole('button', { name: /Vincular|Desvincular/ })).toBeNull();
  });
});
