import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../App.jsx';
import { buscarDemanda } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../test/auth.js';
import { hojeISO } from '../../utils/datas.js';

function LocalAtual() {
  const { pathname } = useLocation();
  return <span data-testid="local">{pathname}</span>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocalAtual />
    </MemoryRouter>,
  );
}

async function abrirFormulario(path = '/flux/demandas/nova') {
  renderAt(path);
  return screen.findByRole('form', { name: 'Dados da demanda' });
}

async function preencherObrigatorios(user) {
  await user.type(screen.getByLabelText(/^Título/), 'Supressão de vegetação em reserva legal');
  await user.type(screen.getByLabelText(/^Descrição/), 'Relato fictício de desmatamento.');
  await user.selectOptions(screen.getByLabelText(/^Origem/), 'DENUNCIA');
  await user.type(screen.getByLabelText(/^Município/), 'Cuiabá');
}

const botaoSalvar = () => screen.getByRole('button', { name: 'Cadastrar demanda' });

describe('Cadastro de demanda', () => {
  beforeEach(() => iniciarSessao());

  it('mostra o formulário com os campos da especificação e o aviso demonstrativo', async () => {
    await abrirFormulario();
    for (const rotulo of [
      /^Título/,
      /^Descrição/,
      /^Origem/,
      /^Categoria/,
      /^Município/,
      /^Localidade/,
      /^Latitude/,
      /^Longitude/,
      /^Data de recebimento/,
      /^Prioridade/,
      /^Prazo sugerido/,
      /^Observações/,
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
    // Data de recebimento já vem com hoje, e as origens vêm do catálogo da API.
    expect(screen.getByLabelText(/^Data de recebimento/)).toHaveValue(hojeISO());
    expect(await screen.findByRole('option', { name: 'Solicitação institucional' })).toBeVisible();
    expect(screen.getByRole('note', { name: /ambiente demonstrativo/i })).toBeInTheDocument();
  });

  it('pré-preenche pela URL (atalho da Sentinela) sem salvar', async () => {
    await abrirFormulario(
      '/flux/demandas/nova?origem=MONITORAMENTO&municipio=Sinop&categoria=QUEIMADA_INCENDIO&latitude=-11.86&longitude=-55.5&titulo=Monitoramento%20INPE%20%E2%80%94%20Sinop',
    );
    expect(screen.getByLabelText(/^Origem/)).toHaveValue('MONITORAMENTO');
    expect(screen.getByLabelText(/^Município/)).toHaveValue('Sinop');
    expect(screen.getByLabelText(/^Latitude/)).toHaveValue('-11.86');
    expect(screen.getByLabelText(/^Título/)).toHaveValue('Monitoramento INPE — Sinop');
    expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/nova');
  });

  it('avisa quando o município do atalho não existe no catálogo', async () => {
    await abrirFormulario('/flux/demandas/nova?municipioId=999&origem=MONITORAMENTO');
    expect(
      await screen.findByText(/município informado no atalho não foi encontrado/),
    ).toBeInTheDocument();
  });

  it('valida no cliente: mostra os erros por campo, foca o primeiro e não chama a API', async () => {
    const user = userEvent.setup();
    let chamadas = 0;
    server.use(
      http.post('/api/demandas', () => {
        chamadas += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    await abrirFormulario();

    await user.clear(screen.getByLabelText(/^Data de recebimento/));
    await user.click(botaoSalvar());

    expect(await screen.findByText('Informe o título.')).toBeInTheDocument();
    expect(screen.getByText('Informe a descrição.')).toBeInTheDocument();
    expect(screen.getByText('Selecione a origem.')).toBeInTheDocument();
    expect(screen.getByText('Selecione o município.')).toBeInTheDocument();
    expect(screen.getByText('Informe a data de recebimento.')).toBeInTheDocument();
    const titulo = screen.getByLabelText(/^Título/);
    expect(titulo).toHaveAttribute('aria-invalid', 'true');
    expect(titulo).toHaveAccessibleDescription(/Informe o título/);
    expect(titulo).toHaveFocus();
    expect(chamadas).toBe(0);
  });

  it('valida coordenadas fora de Mato Grosso e município que não é de MT', async () => {
    const user = userEvent.setup();
    await abrirFormulario();
    await preencherObrigatorios(user);
    await user.clear(screen.getByLabelText(/^Município/));
    await user.type(screen.getByLabelText(/^Município/), 'São Paulo');
    await user.type(screen.getByLabelText(/^Latitude/), '-5');
    await user.type(screen.getByLabelText(/^Longitude/), '-70,5');
    await user.click(botaoSalvar());

    expect(
      await screen.findByText(/Município não encontrado entre os de Mato Grosso/),
    ).toBeVisible();
    expect(screen.getByText('A latitude deve estar entre -18,1 e -7,3.')).toBeVisible();
    expect(screen.getByText('A longitude deve estar entre -61,7 e -50,2.')).toBeVisible();
  });

  it('cadastra: envia o corpo da API, mostra toast com o número e abre os detalhes', async () => {
    const user = userEvent.setup();
    // O handler padrão (store em memória) responde; só observamos o corpo enviado.
    let corpoEnviado;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/api/demandas')) {
        corpoEnviado = await request.clone().json();
      }
    });

    await abrirFormulario();
    await preencherObrigatorios(user);
    await user.selectOptions(screen.getByLabelText(/^Categoria/), 'DESMATAMENTO_ILEGAL');
    await user.selectOptions(screen.getByLabelText(/^Prioridade/), 'ALTA');
    await user.type(screen.getByLabelText(/^Latitude/), '-15,601');
    await user.type(screen.getByLabelText(/^Longitude/), '-56,097');
    await user.click(botaoSalvar());

    expect(await screen.findByText(/Demanda DEM-2026\/0026 cadastrada com sucesso/)).toBeVisible();
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/26'));
    server.events.removeAllListeners();
    expect(corpoEnviado).toMatchObject({
      titulo: 'Supressão de vegetação em reserva legal',
      origem: 'DENUNCIA',
      categoria: 'DESMATAMENTO_ILEGAL',
      municipioId: 5103403,
      latitude: -15.601,
      longitude: -56.097,
      prioridade: 'ALTA',
      dataRecebimento: hojeISO(),
    });
  });

  it('a lista mostra a demanda recém-cadastrada', async () => {
    const user = userEvent.setup();
    await abrirFormulario();
    await preencherObrigatorios(user);
    await user.click(botaoSalvar());
    await screen.findByText(/cadastrada com sucesso/);

    renderAt('/flux/demandas?q=DEM-2026/0026');
    expect(await screen.findAllByRole('link', { name: 'DEM-2026/0026' })).not.toHaveLength(0);
  });

  it('erro 400 do backend aparece no campo correto', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/demandas', () =>
        HttpResponse.json(
          {
            type: 'https://semanexus.demo/problemas/validacao',
            title: 'Dados inválidos',
            status: 400,
            errors: [
              { campo: 'titulo', mensagem: 'título recusado pelo backend (teste)' },
              { campo: 'municipioId', mensagem: 'município não pertence a Mato Grosso' },
            ],
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await abrirFormulario();
    await preencherObrigatorios(user);
    await user.click(botaoSalvar());

    await screen.findByText('título recusado pelo backend (teste)');
    expect(screen.getByLabelText(/^Título/)).toHaveAccessibleDescription(
      /título recusado pelo backend \(teste\)/,
    );
    expect(screen.getByLabelText(/^Título/)).toHaveFocus();
    expect(screen.getByLabelText(/^Município/)).toHaveAccessibleDescription(
      /município não pertence a Mato Grosso/,
    );
    expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/nova');
    // O formulário continua editável para corrigir e reenviar.
    expect(botaoSalvar()).toBeEnabled();
  });

  it('erro 403 e falha de rede viram toast de erro sem sair da tela', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/demandas', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Acesso negado', status: 403 },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await abrirFormulario();
    await preencherObrigatorios(user);
    await user.click(botaoSalvar());

    expect(await screen.findByText(/não tem permissão para esta operação/)).toBeVisible();
    expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/nova');
  });

  it('perfil CONSULTA não acessa a tela de cadastro', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'CONSULTA' });
    renderAt('/flux/demandas/nova');
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Dados da demanda' })).not.toBeInTheDocument();
  });

  it('mostra erro com "Tentar novamente" se os catálogos não carregam', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/catalogos/origens', () => HttpResponse.error(), { once: true }));
    renderAt('/flux/demandas/nova');

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/Não foi possível carregar o formulário/);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('form', { name: 'Dados da demanda' })).toBeInTheDocument();
  });
});

describe('Edição de demanda', () => {
  beforeEach(() => iniciarSessao());

  it('carrega os dados, salva alterações e volta aos detalhes', async () => {
    const user = userEvent.setup();
    await abrirFormulario('/flux/demandas/1/editar');
    const titulo = screen.getByLabelText(/^Título/);
    expect(titulo).toHaveValue('Supressão de vegetação nativa em área de reserva legal (1)');
    expect(screen.getByLabelText(/^Município/)).toHaveValue('Cuiabá');
    expect(
      screen.getByRole('heading', { level: 1, name: /Editar demanda DEM-2026\/0001/ }),
    ).toBeVisible();

    await user.clear(titulo);
    await user.type(titulo, 'Título atualizado da demanda');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText(/Demanda DEM-2026\/0001 atualizada com sucesso/)).toBeVisible();
    await waitFor(() => expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/1'));
  });

  it('bloqueia a edição quando o status não é PENDENTE nem EM_TRIAGEM', async () => {
    await abrirFormulario('/flux/demandas/4/editar');
    expect(screen.getByRole('alert')).toHaveTextContent(/não pode mais ser editada/);
    expect(screen.getByLabelText(/^Título/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('409 da API (status mudou) vira toast de erro', async () => {
    const user = userEvent.setup();
    server.use(
      http.put('/api/demandas/1', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Conflito',
            status: 409,
            detail: 'A demanda só pode ser editada em PENDENTE ou EM_TRIAGEM.',
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await abrirFormulario('/flux/demandas/1/editar');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText(/só pode ser editada em PENDENTE ou EM_TRIAGEM/)).toBeVisible();
    expect(screen.getByTestId('local')).toHaveTextContent('/flux/demandas/1/editar');
  });

  it('demanda inexistente mostra "não encontrada"', async () => {
    renderAt('/flux/demandas/999/editar');
    expect(await screen.findByText('Demanda não encontrada')).toBeInTheDocument();
  });

  it('edita demanda com polígono: preserva área sem tocar e envia removerArea=true ao remover', async () => {
    const user = userEvent.setup();
    const d1 = buscarDemanda(1);
    d1.areaHa = 123.45;
    d1.areaGeometria = {
      type: 'Polygon',
      coordinates: [
        [
          [-56.1, -15.6],
          [-56.09, -15.6],
          [-56.09, -15.59],
          [-56.1, -15.59],
          [-56.1, -15.6],
        ],
      ],
    };
    d1.prazoSugerido = '2026-12-15';

    const corpos = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT' && request.url.endsWith('/api/demandas/1')) {
        corpos.push(await request.clone().json());
      }
    });

    await abrirFormulario('/flux/demandas/1/editar');
    expect(screen.getByLabelText(/^Área afetada/)).toHaveValue('123,45');
    expect(screen.getByLabelText(/^Prazo sugerido/)).toHaveValue('2026-12-15');

    await user.click(screen.getByRole('button', { name: 'Remover área afetada' }));
    expect(screen.getByText(/será removida ao salvar/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desfazer remoção' }));
    expect(screen.getByLabelText(/^Área afetada/)).toHaveValue('123,45');

    await user.click(screen.getByRole('button', { name: 'Remover área afetada' }));
    await user.clear(screen.getByLabelText(/^Prazo sugerido/));
    await user.type(screen.getByLabelText(/^Prazo sugerido/), '2026-12-20');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText(/Demanda DEM-2026\/0001 atualizada com sucesso/)).toBeVisible();
    server.events.removeAllListeners();
    expect(corpos[0]).toMatchObject({
      removerArea: true,
      areaHa: null,
      areaGeometria: null,
      prazoSugerido: '2026-12-20',
    });
    expect(buscarDemanda(1).areaHa).toBeNull();
    expect(buscarDemanda(1).areaGeometria).toBeNull();
    expect(buscarDemanda(1).prazoSugerido).toBe('2026-12-20');
  });
});

describe('Polígono e importação GeoJSON no cadastro de demanda', () => {
  beforeEach(() => iniciarSessao());

  it('importa .geojson válido, preenche centroide e área (ha) e envia ao cadastrar', async () => {
    const user = userEvent.setup();
    let corpoEnviado;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/api/demandas')) {
        corpoEnviado = await request.clone().json();
      }
    });

    await abrirFormulario();
    const geojson = JSON.stringify({
      type: 'Feature',
      properties: { nome: 'Talhão 1' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-56.1, -15.6],
            [-56.09, -15.6],
            [-56.09, -15.59],
            [-56.1, -15.59],
            [-56.1, -15.6],
          ],
        ],
      },
    });
    const arquivo = new File([geojson], 'area.geojson', { type: 'application/geo+json' });
    await user.upload(screen.getByLabelText('Importar .geojson'), arquivo);

    await waitFor(() => expect(screen.getByLabelText(/^Latitude/)).toHaveValue('-15,595'));
    expect(screen.getByLabelText(/^Longitude/)).toHaveValue('-56,095');
    expect(Number(screen.getByLabelText(/^Área afetada/).value.replace(',', '.'))).toBeGreaterThan(
      100,
    );
    expect(screen.getByText(/Polígono ativo \(5 vértices/)).toBeInTheDocument();

    await preencherObrigatorios(user);
    await user.click(botaoSalvar());
    expect(await screen.findByText(/Demanda DEM-2026\/0026 cadastrada com sucesso/)).toBeVisible();
    server.events.removeAllListeners();

    expect(corpoEnviado.areaGeometria.type).toBe('Polygon');
    expect(corpoEnviado.areaHa).toBeGreaterThan(100);
    expect(corpoEnviado.latitude).toBeCloseTo(-15.595, 3);
    expect(corpoEnviado.longitude).toBeCloseTo(-56.095, 3);
  });

  it('rejeita .geojson fora de Mato Grosso ou malformado com erro claro', async () => {
    const user = userEvent.setup();
    await abrirFormulario();
    const foraMt = new File(
      [
        JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [-46.6, -23.5],
              [-46.5, -23.5],
              [-46.5, -23.4],
              [-46.6, -23.5],
            ],
          ],
        }),
      ],
      'fora.geojson',
      { type: 'application/geo+json' },
    );
    await user.upload(screen.getByLabelText('Importar .geojson'), foraMt);
    expect(await screen.findByRole('alert')).toHaveTextContent(/fora de Mato Grosso/);
  });

  it('permite desenhar polígono no mapa Leaflet (adicionar pontos, desfazer e concluir)', async () => {
    const user = userEvent.setup();
    const form = await abrirFormulario();
    await user.click(screen.getByRole('button', { name: 'Desenhar polígono' }));
    expect(screen.getByText(/Modo de desenho ativo: clique no mapa/)).toBeInTheDocument();

    const mapaEl = form.querySelector('.nx-map-area-editor .leaflet-container');
    // Em jsdom o container tem 0x0: definimos dimensões e bounding rect para o Leaflet converter cliques em lat/lon.
    Object.defineProperties(mapaEl, {
      offsetWidth: { value: 600, configurable: true },
      offsetHeight: { value: 320, configurable: true },
      clientWidth: { value: 600, configurable: true },
      clientHeight: { value: 320, configurable: true },
    });
    mapaEl.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 600,
      height: 320,
      right: 600,
      bottom: 320,
    });
    const clicar = (x, y) => fireEvent.click(mapaEl, { clientX: x, clientY: y, bubbles: true });

    clicar(20, 20);
    clicar(40, 20);
    clicar(40, 40);
    clicar(20, 40);
    await waitFor(() => expect(screen.getByText(/\(4 pontos\)/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Desfazer ponto' }));
    expect(screen.getByText(/\(3 pontos\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Concluir polígono' }));
    expect(await screen.findByText(/Polígono ativo \(4 vértices/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Latitude/).value).not.toBe('');
    expect(screen.getByLabelText(/^Área afetada/).value).not.toBe('');
  });
});
