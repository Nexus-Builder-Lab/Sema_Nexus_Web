import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import AuthProvider from '../../auth/AuthProvider.jsx';
import { briefingSentinelaMock } from '../../mocks/fixtures/intelligence.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../test/auth.js';
import SentinelaPanel from './SentinelaPanel.jsx';
import { agruparAnomalias, destinoDaAcao } from './sentinelaAcoes.js';

const URL_BRIEFING = '/api/intelligence/sentinela/briefing';

function renderPainel() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <SentinelaPanel />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('SentinelaPanel', () => {
  beforeEach(() => iniciarSessao(USUARIO_ADMIN));

  it('mostra resumo, modo, anomalias agrupadas e atalhos', async () => {
    renderPainel();
    expect(await screen.findByTestId('sentinela-resumo')).toHaveTextContent(/Sinop concentra/);
    expect(screen.getByTestId('sentinela-modo')).toHaveTextContent('IA local');
    expect(screen.getByText(/válido até/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /INPE sem demanda/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Fila acumulada/ })).toBeInTheDocument();
    expect(screen.getByText('Severidade alta')).toBeInTheDocument();
    expect(screen.getAllByText(/dados públicos do INPE/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('demo-seal')).toBeInTheDocument();
    const mapa = screen.getByRole('link', { name: /focos e DETER de Sinop/ });
    expect(mapa.getAttribute('href')).toBe(
      '/intelligence/inteligencia-ambiental?municipioId=5107909&camada=INPE&de=2026-10-26&ate=2026-11-25',
    );
    const criar = screen.getByRole('link', { name: /Abrir demanda de monitoramento/ });
    expect(criar.getAttribute('href')).toContain('/flux/demandas/nova?origem=MONITORAMENTO');
    expect(criar.getAttribute('href')).toContain('latitude=-11.86');
    expect(
      screen.getByRole('link', { name: /atrasadas da Equipe Norte/ }).getAttribute('href'),
    ).toBe('/flux/demandas?equipeId=2&atrasada=true');
  });

  it('mostra avisos e estado vazio', async () => {
    server.use(
      http.get(URL_BRIEFING, () =>
        HttpResponse.json({
          ...briefingSentinelaMock(),
          anomalias: [],
          avisos: ['Briefing desatualizado'],
        }),
      ),
    );
    renderPainel();
    expect(await screen.findByText('Briefing desatualizado')).toBeInTheDocument();
    expect(screen.getByTestId('sentinela-vazio')).toBeInTheDocument();
  });

  it('503 com Retry-After: explica que ainda não há briefing', async () => {
    server.use(
      http.get(
        URL_BRIEFING,
        () => new HttpResponse(null, { status: 503, headers: { 'Retry-After': '30' } }),
      ),
    );
    renderPainel();
    expect(await screen.findByText(/ainda não foi gerado/)).toBeInTheDocument();
    expect(screen.getByText(/cerca de 30 s/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('403: o painel não aparece', async () => {
    server.use(http.get(URL_BRIEFING, () => new HttpResponse(null, { status: 403 })));
    renderPainel();
    await waitFor(() => expect(screen.queryByTestId('sentinela-painel')).not.toBeInTheDocument());
    expect(screen.queryByText(/Carregando o briefing/)).not.toBeInTheDocument();
  });

  it('erro genérico oferece nova tentativa', async () => {
    server.use(http.get(URL_BRIEFING, () => new HttpResponse(null, { status: 500 })));
    renderPainel();
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByText(/Não foi possível carregar o briefing/)).toBeInTheDocument();
  });
});

describe('sentinelaAcoes', () => {
  it('destinoDaAcao ignora vazios e força origem MONITORAMENTO', () => {
    expect(
      destinoDaAcao({ tipo: 'FILTRAR_MAPA', parametros: { municipioId: 1, de: null, jwt: 'x' } }),
    ).toBe('/intelligence/inteligencia-ambiental?municipioId=1');
    expect(
      destinoDaAcao({ tipo: 'CRIAR_DEMANDA_MONITORAMENTO', parametros: { origem: 'X' } }),
    ).toBe('/flux/demandas/nova?origem=MONITORAMENTO');
    expect(destinoDaAcao({ tipo: 'OUTRA' })).toBeNull();
  });

  it('agruparAnomalias ordena por tipo e severidade', () => {
    const g = agruparAnomalias([
      { id: 1, tipo: 'FILA_ACUMULADA', severidade: 'BAIXA' },
      { id: 2, tipo: 'FILA_ACUMULADA', severidade: 'ALTA' },
      { id: 3, tipo: 'INPE_SEM_DEMANDA', severidade: 'MEDIA' },
    ]);
    expect(g.map((x) => x.tipo)).toEqual(['INPE_SEM_DEMANDA', 'FILA_ACUMULADA']);
    expect(g[1].itens.map((a) => a.id)).toEqual([2, 1]);
  });
});
