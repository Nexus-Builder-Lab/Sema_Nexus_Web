import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../App.jsx';
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
      longitude: null,
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
});
