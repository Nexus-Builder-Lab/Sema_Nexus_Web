import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

async function sugerir() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/flux/demandas/2']}>
      <App />
    </MemoryRouter>,
  );
  await user.click(await screen.findByRole('button', { name: 'Concluir triagem' }));
  const modal = await screen.findByRole('dialog', { name: 'Concluir triagem' });
  await user.click(within(modal).getByRole('button', { name: 'Sugerir com o agente' }));
  return modal;
}

const base = {
  modo: 'DEMO',
  decisao: 'CLASSIFICAR',
  justificativa: 'x',
  duplicatas: [],
  evidencias: [],
  avisos: [],
};

describe('Evidências espaciais do Agente de Triagem', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('mostra raio, período, INPE, duplicatas com distância e documentos', async () => {
    const modal = await sugerir();
    const sec = await within(modal).findByRole('region', { name: 'Evidências espaciais' });
    expect(within(sec).getByTestId('evidencia-referencia')).toHaveTextContent(
      /raio de 10 km; período de 30 dias/,
    );
    expect(within(sec).getByText('Dados públicos do INPE')).toBeInTheDocument();
    expect(
      within(sec).getByText(/7 foco\(s\) de calor no raio; o mais próximo a 1,3 km/),
    ).toBeInTheDocument();
    expect(within(sec).getByText(/dentro de um polígono de alerta DETER/)).toBeInTheDocument();
    expect(within(sec).getByRole('link', { name: 'DEM-2026/0003' })).toHaveAttribute(
      'href',
      '/flux/demandas/3',
    );
    expect(within(sec).getByText(/\(a 2,4 km\)/)).toBeInTheDocument();
    expect(within(sec).getByRole('link', { name: 'Laudo de queimada 2025' })).toHaveAttribute(
      'href',
      '/docia/documentos/7',
    );
  });

  it('referência por município avisa que não há coordenada e mostra estados vazios', async () => {
    server.use(
      http.post('/api/demandas/:id/triagem/sugestao', () =>
        HttpResponse.json({
          ...base,
          espacial: {
            referencia: 'MUNICIPIO',
            raioKm: 10,
            inpe: { focosMunicipio: 5, alertasDeterMunicipio: 1, periodoDias: 30, truncado: false },
            demandasProximas: [],
            documentos: [],
          },
        }),
      ),
    );
    const modal = await sugerir();
    const sec = await within(modal).findByRole('region', { name: 'Evidências espaciais' });
    expect(within(sec).getByRole('note')).toHaveTextContent(/não tem coordenada/);
    expect(
      within(sec).getByText(/No município: 5 foco\(s\) de calor e 1 alerta\(s\) DETER/),
    ).toBeInTheDocument();
    expect(within(sec).getByText('Nenhuma demanda próxima encontrada.')).toBeInTheDocument();
    expect(within(sec).getByText('Nenhum documento relacionado.')).toBeInTheDocument();
  });

  it('sem o bloco espacial não exibe a seção', async () => {
    server.use(http.post('/api/demandas/:id/triagem/sugestao', () => HttpResponse.json(base)));
    const modal = await sugerir();
    await within(modal).findByTestId('agente-modo');
    expect(
      within(modal).queryByRole('region', { name: 'Evidências espaciais' }),
    ).not.toBeInTheDocument();
  });
});
