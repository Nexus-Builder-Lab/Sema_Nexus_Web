import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { prazoResumoMock } from '../../mocks/fixtures/intelligence.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';
import PrazosPage from './PrazosPage.jsx';

const abrir = () =>
  render(
    <MemoryRouter>
      <PrazosPage />
    </MemoryRouter>,
  );

const valorDoCard = (rotulo) =>
  screen
    .getByText(rotulo, { selector: '.nx-kpi-label' })
    .closest('.nx-kpi')
    .querySelector('.nx-kpi-value').textContent;

describe('PrazosPage', () => {
  beforeEach(() => iniciarSessao());

  it('mostra alerta de vencidas, KPIs conferindo com a API e lista com dias de atraso', async () => {
    const r = prazoResumoMock();
    abrir();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      `${r.vencidas} demandas vencidas requerem atenção imediata`,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('há 6 dias (DEM-2026/0031)');
    expect(valorDoCard('Vencidas')).toBe(String(r.vencidas));
    expect(valorDoCard('Próximas do vencimento')).toBe(String(r.proximas));
    expect(valorDoCard('Dentro do prazo')).toBe(String(r.noPrazo));
    expect(valorDoCard('Concluídas')).toBe(String(r.concluidasNoPrazo + r.concluidasComAtraso));
    expect(await screen.findByText(/DEM-2026\/0031/, { selector: 'a' })).toBeInTheDocument();
    expect(screen.getAllByText('dias atraso')).toHaveLength(2);
    expect(screen.getAllByTestId('demo-seal').length).toBeGreaterThan(0);
  });

  it('troca de aba e mostra próximas do vencimento', async () => {
    abrir();
    await screen.findByRole('tab', { name: /Próximas do vencimento/ });
    await userEvent.click(screen.getByRole('tab', { name: /Próximas do vencimento/ }));
    expect(await screen.findByText(/DEM-2026\/0033/, { selector: 'a' })).toBeInTheDocument();
    expect(screen.queryByText(/DEM-2026\/0031/, { selector: 'a' })).not.toBeInTheDocument();
  });

  it('mostra estado vazio na aba sem demandas', async () => {
    abrir();
    await screen.findByRole('tab', { name: /Concluídas/ });
    await userEvent.click(screen.getByRole('tab', { name: /Concluídas/ }));
    expect(await screen.findByText('Nenhuma demanda nesta categoria')).toBeInTheDocument();
  });

  it('sem vencidas mostra aviso de sucesso', async () => {
    server.use(
      http.get('/api/flux/prazos/resumo', () =>
        HttpResponse.json({ ...prazoResumoMock(), vencidas: 0, maisAntigaVencida: null }),
      ),
    );
    abrir();
    expect(await screen.findByText('Nenhuma demanda vencida.')).toBeInTheDocument();
  });

  it('mostra erro com nova tentativa quando o resumo falha', async () => {
    server.use(
      http.get('/api/flux/prazos/resumo', () =>
        HttpResponse.json({ status: 500, title: 'Erro' }, { status: 500 }),
      ),
    );
    abrir();
    await waitFor(() =>
      expect(screen.getByText('Não foi possível carregar o resumo de prazos')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
