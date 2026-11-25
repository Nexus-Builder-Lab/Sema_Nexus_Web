import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthProvider from '../auth/AuthProvider.jsx';
import { server } from '../mocks/server.js';
import { USUARIO_ADMIN, iniciarSessao } from '../test/auth.js';
import AppLayout from './AppLayout.jsx';
import { linkInternoValido, linksValidos } from './linksAssistente.js';

function Local() {
  const l = useLocation();
  return <span data-testid="local">{l.pathname + l.search}</span>;
}

function montar() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/flux/prazos']}>
        <Routes>
          <Route element={<AppLayout user={USUARIO_ADMIN} onLogout={() => {}} />}>
            <Route
              path="*"
              element={
                <>
                  <input aria-label="campo qualquer" />
                  <Local />
                </>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

const gaveta = () => screen.queryByRole('dialog', { name: /Assistente Global/ });
const caixa = () => screen.getByRole('textbox', { name: /Pergunte sobre/ });

describe('Assistente Global', () => {
  beforeEach(() => iniciarSessao());

  it('Ctrl+K abre (inclusive com foco num campo), Esc fecha e devolve o foco', async () => {
    const user = userEvent.setup();
    montar();
    const campo = screen.getByLabelText('campo qualquer');
    await user.click(campo);
    await user.keyboard('{Control>}k{/Control}');
    expect(gaveta()).toBeInTheDocument();
    expect(caixa()).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(gaveta()).not.toBeInTheDocument();
    await waitFor(() => expect(campo).toHaveFocus());
  });

  it('botão da topbar abre e o foco volta ao botão; Cmd+K também abre', async () => {
    const user = userEvent.setup();
    montar();
    const botao = screen.getByRole('button', { name: /Assistente global/ });
    await user.click(botao);
    expect(gaveta()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar assistente' }));
    await waitFor(() => expect(botao).toHaveFocus());
    await user.keyboard('{Meta>}k{/Meta}');
    expect(gaveta()).toBeInTheDocument();
  });

  it('mantém o foco preso com Tab e Shift+Tab', async () => {
    const user = userEvent.setup();
    montar();
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(gaveta().contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 4; i += 1) await user.tab();
    expect(gaveta().contains(document.activeElement)).toBe(true);
  });

  it('mostra modo, resposta como texto puro e só links internos válidos', async () => {
    server.use(
      http.post('/api/agentes/assistente-global', () =>
        HttpResponse.json({
          aviso: 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS',
          modo: 'LOCAL',
          modelo: 'qwen3:4b-instruct',
          resposta: '<img src=x onerror=alert(1)> Duas demandas vencidas.',
          links: [
            { tipo: 'DEMANDA', rotulo: 'Demanda 10', url: '/flux/demandas/10' },
            { tipo: 'X', rotulo: 'Externo', url: 'https://evil.example/' },
            { tipo: 'X', rotulo: 'Protocolo', url: '//evil.example/a' },
            { tipo: 'X', rotulo: 'Rota desconhecida', url: '/nao-existe' },
          ],
          avisos: ['Resposta da IA descartada.'],
        }),
      ),
    );
    const user = userEvent.setup();
    montar();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(caixa(), 'prazos?');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    expect(await screen.findByText(/IA local · qwen3/)).toBeInTheDocument();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('Resposta da IA descartada.')).toBeInTheDocument();
    expect(screen.queryByText('Externo')).toBeNull();
    expect(screen.queryByText('Protocolo')).toBeNull();
    expect(screen.queryByText('Rota desconhecida')).toBeNull();
    await user.click(screen.getByRole('link', { name: 'Demanda 10' }));
    expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/10');
    expect(gaveta()).not.toBeInTheDocument();
  });

  it('exibe 429 e 503 como erro', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/agentes/assistente-global', () =>
        HttpResponse.json({ retryAfterSegundos: 12 }, { status: 429 }),
      ),
    );
    montar();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(caixa(), 'oi');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente em 12 s');
    server.use(
      http.post('/api/agentes/assistente-global', () =>
        HttpResponse.json({ title: 'x' }, { status: 503 }),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    expect(await screen.findByText(/indisponível/)).toBeInTheDocument();
  });

  it('fechar a gaveta aborta a requisição em andamento', async () => {
    const abortar = vi.spyOn(AbortController.prototype, 'abort');
    server.use(http.post('/api/agentes/assistente-global', () => new Promise(() => {})));
    const user = userEvent.setup();
    montar();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(caixa(), 'lento');
    await user.click(screen.getByRole('button', { name: 'Perguntar' }));
    expect(await screen.findByText(/30 a 50 segundos/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(gaveta()).not.toBeInTheDocument();
    await waitFor(() => expect(abortar).toHaveBeenCalled());
    abortar.mockRestore();
  });
});

describe('linksAssistente', () => {
  it('valida só rotas internas conhecidas', () => {
    expect(linkInternoValido('/flux/demandas/10')).toBe(true);
    expect(linkInternoValido('/flux/demandas?atrasada=true')).toBe(true);
    expect(linkInternoValido('/docia/documentos/3')).toBe(true);
    expect(linkInternoValido('/intelligence/inteligencia-ambiental?camada=INPE')).toBe(true);
    const ruins = [
      'https://x.com',
      '//x.com',
      'javascript:alert(1)',
      '/foo',
      '/flux/demandas/abc',
      null,
    ];
    for (const ruim of ruins) expect(linkInternoValido(ruim)).toBe(false);
    expect(linksValidos('x')).toEqual([]);
  });
});
