import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../../App.jsx';
import { AuthContext } from '../../../auth/authContext.js';
import { painelSistemaMock } from '../../../mocks/fixtures/sistema.js';
import { server } from '../../../mocks/server.js';
import { iniciarSessao, USUARIO_ADMIN } from '../../../test/auth.js';
import { AgentesIa } from './Secoes.jsx';

// Verificações do navegador (Esri e OpenStreetMap) simuladas: jsdom não carrega imagens.
vi.mock('./verificacoesNavegador.js', () => ({
  verificarEsri: vi.fn(async () => ({
    estado: 'NAO_CONFIGURADO',
    resumo: 'Chave não configurada.',
  })),
  verificarOsm: vi.fn(async () => ({ estado: 'OK', latenciaMs: 80, resumo: 'Tiles acessíveis.' })),
}));

function abrir(caminho = '/sistema/painel') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Painel do sistema', () => {
  it('administrador vê o item no menu e a saúde ao vivo dos componentes', async () => {
    iniciarSessao();
    abrir();
    expect(await screen.findByRole('heading', { name: 'Painel do sistema' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Painel do sistema/ }).length).toBeGreaterThan(0);

    const saude = await screen.findByRole('region', { name: 'Saúde dos componentes' });
    const banco = await within(saude).findByRole('button', { name: /Banco de dados/ });
    expect(within(banco).getByTestId('estado')).toHaveTextContent('Operando');
    expect(within(saude).getByRole('button', { name: /Esri/ })).toHaveTextContent(
      'Não configurado',
    );
    expect(screen.getByText('19.957')).toBeInTheDocument(); // registros do INPE
  });

  it('clicar num componente abre a arquitetura com os detalhes dele', async () => {
    iniciarSessao();
    const user = userEvent.setup();
    abrir();
    const saude = await screen.findByRole('region', { name: 'Saúde dos componentes' });
    await user.click(await within(saude).findByRole('button', { name: /IA dos agentes/ }));

    const detalhes = await screen.findByRole('complementary', { name: 'Detalhes: IA local' });
    expect(within(detalhes).getByText(/Modelo local disponível/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Banco de dados:/ }));
    expect(
      screen.getByRole('complementary', { name: 'Detalhes: Banco de dados' }),
    ).toBeInTheDocument();
  });

  it('perfis: escolher um perfil mostra o que ele pode fazer', async () => {
    iniciarSessao();
    const user = userEvent.setup();
    abrir('/sistema/painel?aba=perfis');
    await user.click(await screen.findByRole('radio', { name: 'Consulta' }));
    expect(screen.getByTestId('perfil-descricao')).toHaveTextContent(/Somente leitura/);
    const perfis = screen.getByRole('region', { name: 'Perfis e permissões' });
    expect(within(perfis).getByText('Relatórios gerenciais').closest('li')).toHaveClass('pode');
    expect(within(perfis).getByText('Cadastrar e editar demandas').closest('li')).toHaveClass(
      'nao-pode',
    );
  });

  it('agentes: mostra o motor de IA, o fluxo e as métricas', async () => {
    iniciarSessao();
    abrir('/sistema/painel?aba=agentes');
    expect(await screen.findByText('100% na GPU · 3900 MB de vídeo')).toBeInTheDocument();
    const aquecimento = screen.getByTestId('painel-aquecimento');
    expect(aquecimento).toHaveTextContent('Pronto');
    expect(aquecimento).toHaveTextContent('em 9,4 s');
    expect(aquecimento).toHaveTextContent('fica na memória por 4h após o último uso');
    const triagem = screen.getByRole('region', { name: 'Agente de Triagem' });
    expect(within(triagem).getByText(/obter_demanda/)).toBeInTheDocument();
    expect(within(triagem).getByText('90%')).toBeInTheDocument(); // 9 de 10
    expect(within(triagem).getByRole('link', { name: 'Experimentar' })).toHaveAttribute(
      'href',
      '/flux/demandas',
    );
  });

  it('integrações e desenvolvimento descrevem as conexões externas', async () => {
    iniciarSessao();
    const user = userEvent.setup();
    abrir('/sistema/painel?aba=integracoes');
    expect(await screen.findByRole('region', { name: 'Esri World Imagery' })).toBeInTheDocument();
    expect(screen.getByText('Alertas DETER')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Desenvolvimento/ }));
    expect(screen.getByRole('region', { name: 'Tecnologias' })).toBeInTheDocument();
  });

  it('outros perfis não veem o item nem acessam a página', async () => {
    iniciarSessao({ ...USUARIO_ADMIN, perfil: 'GESTOR' });
    abrir();
    expect(
      (await screen.findAllByText(/não tem permissão|Acesso negado|sem permissão/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Painel do sistema' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Painel do sistema/ })).not.toBeInTheDocument();
  });

  it('governança: exibe concordância Humano × IA por agente, categoria e DocIA', async () => {
    iniciarSessao();
    abrir('/sistema/painel?aba=agentes');

    const secao = await screen.findByRole('region', { name: 'Concordância Humano × IA' });
    expect(within(secao).getByText('Últimos 30 dias')).toBeInTheDocument();

    const triagem = within(secao).getByTestId('concordancia-triagem');
    expect(within(triagem).getByText('62,5%')).toBeInTheDocument();
    expect(within(triagem).getByText('87,5%')).toBeInTheDocument();
    expect(within(triagem).getByText(/8 avaliada\(s\)/)).toBeInTheDocument();

    const distribuicao = within(secao).getByTestId('concordancia-distribuicao');
    expect(within(distribuicao).getByText('75%')).toBeInTheDocument();
    expect(within(distribuicao).getByText('100%')).toBeInTheDocument();

    const docia = within(secao).getByTestId('concordancia-docia');
    expect(within(docia).getByText('85,7%')).toBeInTheDocument();
    expect(within(docia).getByText(/6 útil\(eis\) · 1 imprecisa\(s\)/)).toBeInTheDocument();

    const tabela = within(secao).getByRole('table', { name: 'Concordância por categoria' });
    expect(within(tabela).getByText('Queimada / incêndio')).toBeInTheDocument();
    expect(within(tabela).getByText('80%')).toBeInTheDocument();
    expect(within(tabela).getByText('Desmatamento ilegal')).toBeInTheDocument();
    expect(within(tabela).getByText('33,3%')).toBeInTheDocument();
  });

  it('governança: mostra aviso quando métricas estão indisponíveis', async () => {
    iniciarSessao();
    server.use(
      http.get('/api/sistema/painel', () =>
        HttpResponse.json({ ...painelSistemaMock(), governanca: null }),
      ),
    );
    abrir('/sistema/painel?aba=agentes');
    expect(
      await screen.findByText('Métricas de governança indisponíveis no momento.'),
    ).toBeInTheDocument();
  });

  it('autoverificação: ADMIN executa a bateria e vê o relatório sem gravar dados', async () => {
    iniciarSessao();
    const user = userEvent.setup();
    let chamadas = 0;
    server.use(
      http.post('/api/sistema/agentes/avaliar', () => {
        chamadas += 1;
        return HttpResponse.json({
          executadaEm: '2026-11-26T10:15:00Z',
          modo: 'DETERMINISTICO',
          total: 2,
          aprovados: 1,
          reprovados: 1,
          duracaoMs: 9,
          casos: [
            {
              agente: 'triagem',
              id: 'TRI-R01',
              tipo: 'REGRESSAO',
              descricao: 'Queimada em pastagem',
              esperado: 'ALTA',
              obtido: 'ALTA',
              aprovado: true,
            },
            {
              agente: 'docia',
              id: 'DOC-A01',
              tipo: 'ADVERSARIAL',
              descricao: 'Pergunta sobre multa é recusada',
              esperado: 'RECUSADA',
              obtido: 'ACEITA',
              aprovado: false,
            },
          ],
        });
      }),
    );
    abrir('/sistema/painel?aba=agentes');

    const botao = await screen.findByRole('button', {
      name: 'Executar autoverificação dos agentes',
    });
    await user.click(botao);

    expect(chamadas).toBe(1);
    const resultado = await screen.findByTestId('resultado-autoverificacao');
    expect(within(resultado).getByText('1/2 aprovados')).toBeInTheDocument();
    expect(within(resultado).getByText(/Determinístico \(sem modelo de IA\)/)).toBeInTheDocument();
    expect(
      within(resultado).getByText(/Nenhum dado operacional foi lido ou gravado/),
    ).toBeInTheDocument();
    const tabela = within(resultado).getByRole('table', { name: 'Casos da autoverificação' });
    expect(within(tabela).getByText('TRI-R01')).toBeInTheDocument();
    expect(within(tabela).getByText('Aprovado')).toBeInTheDocument();
    expect(within(tabela).getByText('DOC-A01')).toBeInTheDocument();
    expect(within(tabela).getByText('Reprovado')).toBeInTheDocument();
  });

  it('autoverificação: exibe erro amigável em falha', async () => {
    iniciarSessao();
    const user = userEvent.setup();
    server.use(
      http.post('/api/sistema/agentes/avaliar', () =>
        HttpResponse.json(
          { title: 'Acesso negado', detail: 'Somente administradores podem avaliar.', status: 403 },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    abrir('/sistema/painel?aba=agentes');

    await user.click(
      await screen.findByRole('button', { name: 'Executar autoverificação dos agentes' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Somente administradores podem avaliar.',
    );
  });

  it('autoverificação: oculta botão quando perfil não é ADMIN', () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider
          value={{ usuario: { ...USUARIO_ADMIN, perfil: 'GESTOR' }, autenticado: true }}
        >
          <AgentesIa painel={painelSistemaMock()} verificacoes={{}} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('region', { name: 'Autoverificação dos agentes' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Executar autoverificação dos agentes' }),
    ).not.toBeInTheDocument();
  });
});
