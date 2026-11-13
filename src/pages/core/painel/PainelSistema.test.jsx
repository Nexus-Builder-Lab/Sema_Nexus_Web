import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../../App.jsx';
import { iniciarSessao, USUARIO_ADMIN } from '../../../test/auth.js';

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
});
