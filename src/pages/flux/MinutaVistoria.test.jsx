import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { podeGerarMinuta } from '../../auth/perfis.js';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

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
});
