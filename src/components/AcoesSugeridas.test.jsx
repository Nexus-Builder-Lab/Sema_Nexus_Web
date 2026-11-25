import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { server } from '../mocks/server.js';
import { iniciarSessao } from '../test/auth.js';
import AcoesSugeridas, { destinoDaAcao } from './AcoesSugeridas.jsx';

function Local() {
  const l = useLocation();
  return <div data-testid="local">{l.pathname + l.search}</div>;
}
function montar(acoes) {
  return render(
    <MemoryRouter>
      <AcoesSugeridas acoes={acoes} />
      <Routes>
        <Route path="*" element={<Local />} />
      </Routes>
    </MemoryRouter>,
  );
}
const VINCULO = {
  tipo: 'SUGERIR_VINCULO_DEMANDA',
  rotulo: 'Vincular à demanda DEM-1',
  parametros: { documentoId: 7, demandaId: 3 },
};

describe('AcoesSugeridas', () => {
  beforeEach(() => iniciarSessao());

  it('navega para o destino de cada tipo e ignora tipo desconhecido', async () => {
    const user = userEvent.setup();
    montar([
      { tipo: 'ABRIR_COMPARACAO', rotulo: 'Comparar', parametros: { aId: 1, bId: 2 } },
      { tipo: 'ABRIR_DEMANDA', rotulo: 'Abrir demanda', parametros: { demandaId: 9 } },
      {
        tipo: 'VER_NO_MAPA',
        rotulo: 'Ver no mapa',
        parametros: { lat: -15.6, lon: -56.1, zoom: 11 },
      },
      { tipo: 'APAGAR_TUDO', rotulo: 'Perigo', parametros: {} },
    ]);
    expect(screen.queryByRole('button', { name: 'Perigo' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Comparar' }));
    expect(screen.getByTestId('local')).toHaveTextContent('/docia/comparacao?a=1&b=2');
    await user.click(screen.getByRole('button', { name: 'Abrir demanda' }));
    expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/9');
    await user.click(screen.getByRole('button', { name: 'Ver no mapa' }));
    expect(screen.getByTestId('local')).toHaveTextContent(
      '/intelligence/inteligencia-ambiental?lat=-15.6&lon=-56.1&zoom=11',
    );
  });

  it('não grava o vínculo sem confirmação e grava após confirmar', async () => {
    const user = userEvent.setup();
    let chamadas = 0;
    server.use(
      http.post('/api/demandas/3/documentos', async ({ request }) => {
        chamadas += 1;
        expect(await request.json()).toEqual({ documentoId: 7 });
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    montar([VINCULO]);
    await user.click(screen.getByRole('button', { name: VINCULO.rotulo }));
    expect(screen.getByText('Vincular documento 7 à demanda 3?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(chamadas).toBe(0);
    await user.click(screen.getByRole('button', { name: VINCULO.rotulo }));
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(chamadas).toBe(1));
    expect(await screen.findByRole('status')).toHaveTextContent('vinculado à demanda 3');
  });

  it.each([
    [409, 'já está vinculado'],
    [403, 'não tem permissão'],
  ])('trata %i ao vincular', async (status, texto) => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/demandas/3/documentos', () =>
        HttpResponse.json({ message: 'x' }, { status }),
      ),
    );
    montar([VINCULO]);
    await user.click(screen.getByRole('button', { name: VINCULO.rotulo }));
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    expect(await screen.findByRole('status')).toHaveTextContent(texto);
  });

  it('valida parâmetros', () => {
    expect(destinoDaAcao({ tipo: 'ABRIR_DEMANDA', parametros: { demandaId: 'x' } })).toBeNull();
    expect(destinoDaAcao({ tipo: 'VER_NO_MAPA', parametros: { lat: 200, lon: 0 } })).toBeNull();
  });

  it('VER_NO_MAPA fora de MT ou não numérico não renderiza; zoom é limitado', () => {
    expect(destinoDaAcao({ tipo: 'VER_NO_MAPA', parametros: { lat: null, lon: -56 } })).toBeNull();
    expect(destinoDaAcao({ tipo: 'VER_NO_MAPA', parametros: { lat: 'abc', lon: -56 } })).toBeNull();
    expect(destinoDaAcao({ tipo: 'VER_NO_MAPA', parametros: { lat: 48.8, lon: 2.3 } })).toBeNull();
    expect(
      destinoDaAcao({ tipo: 'VER_NO_MAPA', parametros: { lat: -15, lon: -56, zoom: 99 } }),
    ).toMatch(/zoom=18/);
    montar([{ tipo: 'VER_NO_MAPA', rotulo: 'Fora', parametros: { lat: 48.8, lon: 2.3 } }]);
    expect(screen.queryByRole('button', { name: 'Fora' })).toBeNull();
  });
});
