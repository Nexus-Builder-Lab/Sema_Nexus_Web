import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../App.jsx';
import { problema } from '../../mocks/contrato.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

function LocalAtual() {
  const { pathname } = useLocation();
  return <span data-testid="local">{pathname}</span>;
}

async function abrir(path = '/docia/documentos/novo') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocalAtual />
    </MemoryRouter>,
  );
  return screen.findByRole('form', { name: 'Dados do documento' });
}

const pdf = () => new File(['%PDF-1.4'], 'laudo.pdf', { type: 'application/pdf' });

async function preencher(user, arquivo = pdf()) {
  await user.upload(screen.getByLabelText(/^Arquivo/), arquivo);
  await user.type(screen.getByLabelText(/^Título/), 'Laudo de vistoria fictício');
  await user.type(screen.getByLabelText(/^Categoria/), 'Relatório técnico');
  await user.type(screen.getByLabelText(/^Tipo/), 'Laudo');
}

const enviar = () => screen.getByRole('button', { name: 'Enviar documento' });

// O File do jsdom não é aceito pelo parser multipart do undici; lê o corpo como texto.
async function partes(request) {
  const texto = await request.text();
  const campos = {};
  for (const m of texto.matchAll(
    /Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]*)")?\r\n(?:Content-Type:[^\r]*\r\n)?\r\n([\s\S]*?)\r\n--/gi,
  )) {
    (campos[m[1]] ||= []).push(m[2] ?? m[3]);
  }
  return campos;
}

describe('Cadastro de documento', () => {
  beforeEach(() => iniciarSessao());

  it('valida no cliente: extensão, campos obrigatórios e não chama a API', async () => {
    const user = userEvent.setup({ applyAccept: false });
    let chamadas = 0;
    server.use(
      http.post('/api/documentos', () => {
        chamadas += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await abrir();
    await user.upload(screen.getByLabelText(/^Arquivo/), new File(['x'], 'virus.exe'));
    await user.click(enviar());
    expect(await screen.findByText(/Tipo de arquivo não permitido/)).toBeVisible();
    expect(screen.getByLabelText(/^Título/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Categoria/)).toHaveAttribute('aria-invalid', 'true');
    expect(chamadas).toBe(0);
  });

  it('envia o PDF com os metadados, mostra sucesso e abre o documento', async () => {
    const user = userEvent.setup();
    let recebido;
    server.use(
      http.post('/api/documentos', async ({ request }) => {
        const dados = await partes(request);
        recebido = {
          titulo: dados.titulo?.[0],
          categoria: dados.categoria?.[0],
          arquivo: dados.arquivo?.[0],
          palavras: dados.palavrasChave,
        };
        return HttpResponse.json({ id: 77, titulo: 'Laudo de vistoria fictício' }, { status: 201 });
      }),
      http.get('/api/documentos/77', () =>
        HttpResponse.json({ id: 77, titulo: 'Laudo de vistoria fictício', demandas: [] }),
      ),
    );
    await abrir();
    await preencher(user);
    await user.type(screen.getByLabelText(/^Palavras-chave/), 'vistoria, mt');
    await user.click(enviar());

    await waitFor(() =>
      expect(screen.getByTestId('local')).toHaveTextContent('/docia/documentos/77'),
    );
    expect(await screen.findByText('Documento enviado com sucesso.')).toBeVisible();
    expect(recebido).toEqual({
      titulo: 'Laudo de vistoria fictício',
      categoria: 'Relatório técnico',
      arquivo: expect.any(String), // jsdom serializa o File como "blob"
      palavras: ['vistoria', 'mt'],
    });
  });

  it('mostra mensagens compreensíveis para 413 e 415', async () => {
    const user = userEvent.setup();
    let status = 413;
    server.use(
      http.post('/api/documentos', () =>
        problema(status, 'Erro técnico', 'detalhe técnico', '/api/documentos'),
      ),
    );
    await abrir();
    await preencher(user);
    await user.click(enviar());
    expect(await screen.findByRole('alert')).toHaveTextContent(/excede o limite de 10 MB/);

    status = 415;
    await user.click(enviar());
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Tipo de arquivo não aceito/),
    );
  });

  it('com demandaId, informa o vínculo e volta para a demanda', async () => {
    const user = userEvent.setup();
    let demandaId;
    server.use(
      http.post('/api/documentos', async ({ request }) => {
        demandaId = (await partes(request)).demandaId?.[0];
        return HttpResponse.json({ id: 78 }, { status: 201 });
      }),
    );
    await abrir('/docia/documentos/novo?demandaId=3');
    expect(screen.getByRole('status')).toHaveTextContent(/vinculado à demanda #3/);
    await preencher(user);
    await user.click(enviar());
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/3'));
    expect(demandaId).toBe('3');
  });
});
