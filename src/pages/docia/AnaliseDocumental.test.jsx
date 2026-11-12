import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

const TEXTO =
  'Processo: DEMO-2026/0012\nEm 05/11/2026 constatou-se supressão de 120,5 ha em Sinop, com multa de R$ 15.000,00. A conclusão recomenda embargo da área.';

function api({ texto = TEXTO } = {}) {
  server.use(
    http.get('/geo/mt-municipios.geojson', () =>
      HttpResponse.json({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { id: 5107909, nome: 'Sinop' }, geometry: null }],
      }),
    ),
    http.get('/api/documentos', () =>
      HttpResponse.json({
        content: [
          { id: 1, titulo: 'Relatório de Sinop', categoria: 'Relatório técnico' },
          { id: 2, titulo: 'Outro documento', categoria: 'Laudo' },
        ],
        page: 0,
        size: 100,
        totalElements: 2,
        totalPages: 1,
      }),
    ),
    http.get('/api/documentos/:id', ({ params }) =>
      HttpResponse.json({
        id: Number(params.id),
        titulo: 'Relatório de Sinop',
        categoria: 'Relatório técnico',
        textoExtraido: texto,
        demandas: [],
      }),
    ),
  );
}

function abrir() {
  iniciarSessao();
  return render(
    <MemoryRouter initialEntries={['/docia/analise']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Análise documental', () => {
  it('lista documentos, mostra o aviso e analisa o selecionado', async () => {
    api();
    abrir();
    expect(await screen.findByText(/sem uso de inteligência artificial/i)).toBeInTheDocument();
    expect(await screen.findByText('Selecione um documento')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Relatório de Sinop/ }));
    expect(await screen.findByText(/Resumo extrativo \(3 frases/)).toBeInTheDocument();
    expect(screen.getAllByText('DEMO-2026/0012').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 15.000,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sinop').length).toBeGreaterThan(0);
    expect(screen.getByText('Campos estruturados identificados')).toBeInTheDocument();
  });

  it('documento sem texto extraído mostra estado vazio', async () => {
    api({ texto: null });
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: /Relatório de Sinop/ }));
    expect(await screen.findByText('Documento sem conteúdo textual')).toBeInTheDocument();
  });

  it('filtra a lista pelo título', async () => {
    api();
    abrir();
    await screen.findByRole('button', { name: /Outro documento/ });
    await userEvent.type(screen.getByLabelText('Filtrar documentos'), 'outro');
    expect(screen.queryByRole('button', { name: /Relatório de Sinop/ })).not.toBeInTheDocument();
  });
});
