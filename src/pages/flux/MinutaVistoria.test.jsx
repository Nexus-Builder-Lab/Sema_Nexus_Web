import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { podeGerarMinuta } from '../../auth/perfis.js';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import MarkdownSeguro from './MarkdownSeguro.jsx';

function abrir() {
  return render(
    <MemoryRouter initialEntries={['/flux/demandas/1']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Minuta de vistoria', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('podeGerarMinuta por perfil e fiscal designado', () => {
    expect(podeGerarMinuta({ perfil: 'GESTOR' }, {})).toBe(true);
    expect(podeGerarMinuta({ perfil: 'CONSULTA' }, {})).toBe(false);
    expect(podeGerarMinuta({ id: 5, perfil: 'FISCAL' }, { fiscal: { id: 5 } })).toBe(true);
    expect(podeGerarMinuta({ id: 6, perfil: 'FISCAL' }, { fiscal: { id: 5 } })).toBe(false);
  });

  it('edita e só envia após a confirmação final (upload + vínculo)', async () => {
    const user = userEvent.setup();
    let upload = null;
    let vinculo = null;
    server.use(
      http.post('/api/documentos', async ({ request }) => {
        upload = await request.text();
        return HttpResponse.json({ id: 77 }, { status: 201 });
      }),
      http.post('/api/demandas/:id/documentos', async ({ request }) => {
        vinculo = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    abrir();
    await user.click(await screen.findByRole('button', { name: 'Gerar minuta de relatório' }));
    const modal = await screen.findByRole('dialog');
    const area = await within(modal).findByLabelText(/Texto da minuta/);
    expect(within(modal).getAllByText(/MINUTA GERADA PARA REVISÃO HUMANA/).length).toBeGreaterThan(
      0,
    );
    expect(within(modal).getByText(/Regras locais/)).toBeInTheDocument();
    await user.type(area, ' EDITADO');
    await user.click(within(modal).getByRole('button', { name: 'Enviar como documento' }));
    expect(upload).toBeNull();
    expect(within(modal).getByLabelText('Título do documento')).toHaveValue(
      'Minuta de relatório — DEM-2026/0001',
    );
    await user.click(within(modal).getByRole('button', { name: 'Confirmar envio' }));
    await waitFor(() => expect(vinculo).toEqual({ documentoId: 77 }));
    expect(upload).toContain('Relatório técnico');
    expect(upload).toContain('Minuta de relatório — DEM-2026/0001');
    expect(upload).toContain('name="arquivo"');
    expect(upload).toContain('2026-');
  });

  it('descartar não envia nada e erro 429 é tratado', async () => {
    const user = userEvent.setup();
    let chamou = false;
    server.use(
      http.post('/api/documentos', () => {
        chamou = true;
        return HttpResponse.json({ id: 1 }, { status: 201 });
      }),
      http.post('/api/demandas/:id/minuta-vistoria', () =>
        HttpResponse.json({ status: 429, detail: 'x' }, { status: 429 }),
      ),
    );
    abrir();
    await user.click(await screen.findByRole('button', { name: 'Gerar minuta de relatório' }));
    expect(await screen.findByText(/Muitas solicitações/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(chamou).toBe(false);
  });

  async function ateConfirmar(user) {
    await user.click(await screen.findByRole('button', { name: 'Gerar minuta de relatório' }));
    const modal = await screen.findByRole('dialog');
    await within(modal).findByLabelText(/Texto da minuta/);
    await user.click(within(modal).getByRole('button', { name: 'Enviar como documento' }));
    return modal;
  }

  it('vínculo falho após upload trava a edição e repete só o vínculo', async () => {
    const user = userEvent.setup();
    let uploads = 0;
    let tentativas = 0;
    server.use(
      http.post('/api/documentos', () => {
        uploads += 1;
        return HttpResponse.json({ id: 77 }, { status: 201 });
      }),
      http.post('/api/demandas/:id/documentos', () => {
        tentativas += 1;
        return tentativas === 1
          ? HttpResponse.json({ status: 500, detail: 'falhou' }, { status: 500 })
          : HttpResponse.json({}, { status: 201 });
      }),
    );
    abrir();
    const modal = await ateConfirmar(user);
    await user.click(within(modal).getByRole('button', { name: 'Confirmar envio' }));
    expect(await within(modal).findByText(/vínculo à demanda falhou/)).toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: 'Voltar à edição' })).toBeNull();
    await user.click(within(modal).getByRole('button', { name: 'Tentar vincular novamente' }));
    await waitFor(() => expect(tentativas).toBe(2));
    expect(uploads).toBe(1);
  });

  it('falha no upload mantém o texto e permite voltar à edição', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/documentos', () =>
        HttpResponse.json({ status: 500, detail: 'Erro no upload' }, { status: 500 }),
      ),
    );
    abrir();
    const modal = await ateConfirmar(user);
    await user.click(within(modal).getByRole('button', { name: 'Confirmar envio' }));
    expect(await within(modal).findByRole('alert')).toBeInTheDocument();
    await user.click(within(modal).getByRole('button', { name: 'Voltar à edição' }));
    expect(within(modal).getByLabelText(/Texto da minuta/)).toBeInTheDocument();
  });

  it.each([
    ['CONSULTA', { id: 9, nome: 'C', email: 'c@x', perfil: 'CONSULTA' }],
    ['FISCAL não designado', { id: 999, nome: 'F', email: 'f@x', perfil: 'FISCAL' }],
  ])('esconde o botão para %s', async (_n, usuario) => {
    iniciarSessao(usuario);
    abrir();
    await screen.findByRole('heading', { name: /DEM-2026\/0001/ });
    expect(screen.queryByRole('button', { name: 'Gerar minuta de relatório' })).toBeNull();
  });
});

describe('MarkdownSeguro', () => {
  it('não cria HTML bruto, links nem negrito aninhado quebrado', () => {
    const { container } = render(
      <MarkdownSeguro
        texto={[
          '<script>alert(1)</script>',
          '[x](javascript:alert(1))',
          '**a **b** c**',
          '- item <img src=x onerror=1>',
        ].join(String.fromCharCode(10))}
      />,
    );
    expect(container.querySelector('script, img, a')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
    expect(container.textContent).toContain('[x](javascript:alert(1))');
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });
});
