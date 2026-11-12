import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App.jsx';
import { acoesDisponiveis } from '../../auth/perfis.js';
import { resetDemandasMock } from '../../mocks/fixtures/demandas.js';
import { server } from '../../mocks/server.js';
import { iniciarSessao } from '../../test/auth.js';

// Com 25 demandas: id 4 = DISTRIBUIDA (fiscal 5), 5 = EM_ANDAMENTO (fiscal 3),
// 6 = AGUARDANDO_CONCLUSAO (fiscal 5), 7 = FINALIZADA.
function abrir(id) {
  return render(
    <MemoryRouter initialEntries={[`/flux/demandas/${id}`]}>
      <App />
    </MemoryRouter>,
  );
}

const botao = (nome) => screen.queryByRole('button', { name: nome });
const FISCAL_3 = { id: 3, nome: 'Fiscal Demonstrativo 1', email: 'f@x', perfil: 'FISCAL' };

describe('acoesDisponiveis (execução)', () => {
  const demanda = { fiscal: { id: 3 } };
  it('libera execução ao fiscal designado, ADMIN e GESTOR; nega a outro fiscal', () => {
    expect(acoesDisponiveis('DISTRIBUIDA', { id: 3, perfil: 'FISCAL' }, demanda)).toEqual([
      'INICIAR_EXECUCAO',
    ]);
    expect(acoesDisponiveis('DISTRIBUIDA', { id: 9, perfil: 'FISCAL' }, demanda)).toEqual([]);
    expect(acoesDisponiveis('EM_ANDAMENTO', { id: 1, perfil: 'GESTOR' }, demanda)).toEqual([
      'REGISTRAR_ATIVIDADE',
      'REGISTRAR_FISCALIZACAO',
    ]);
    expect(acoesDisponiveis('EM_ANDAMENTO', { id: 3, perfil: 'ANALISTA' }, demanda)).toEqual([]);
  });

  it('só ADMIN e GESTOR concluem ou devolvem', () => {
    expect(acoesDisponiveis('AGUARDANDO_CONCLUSAO', { perfil: 'ADMIN' }, demanda)).toEqual([
      'CONCLUIR',
      'DEVOLVER',
    ]);
    expect(acoesDisponiveis('AGUARDANDO_CONCLUSAO', { id: 3, perfil: 'FISCAL' }, demanda)).toEqual(
      [],
    );
  });
});

describe('Execução, fiscalização e conclusão', () => {
  beforeEach(() => {
    resetDemandasMock();
    iniciarSessao();
  });

  it('leva a demanda de Distribuída a Finalizada pela interface, com histórico', async () => {
    const user = userEvent.setup();
    abrir(4);

    await user.click(await screen.findByRole('button', { name: 'Iniciar execução' }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Iniciar execução' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Registrar atividade' }));
    let modal = await screen.findByRole('dialog');
    await user.type(within(modal).getByLabelText(/^Descrição da atividade/), 'Contato com o dono.');
    await user.click(within(modal).getByRole('button', { name: 'Registrar atividade' }));
    expect(await screen.findByText('Contato com o dono.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Registrar fiscalização' }));
    modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Não gera auto de infração/)).toBeInTheDocument();
    await user.type(within(modal).getByLabelText(/^Atividades realizadas/), 'Vistoria no local.');
    await user.type(within(modal).getByLabelText(/^Resultado/), 'Irregularidade confirmada.');
    await user.type(within(modal).getByLabelText(/^Evidências/), 'Fotos fictícias.');
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));

    const secao = await screen.findByRole('region', { name: 'Fiscalização' });
    expect(await within(secao).findByText('Irregularidade confirmada.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Concluir demanda' }));
    modal = await screen.findByRole('dialog');
    await user.type(within(modal).getByLabelText(/^Resultado final/), 'Encerrada.');
    await user.type(within(modal).getByLabelText(/^Justificativa/), 'Fiscalização completa.');
    await user.click(within(modal).getByRole('button', { name: 'Concluir' }));

    expect(await screen.findByText('Finalizada')).toBeInTheDocument();
    expect(botao('Concluir demanda')).not.toBeInTheDocument();
    const linha = screen.getByRole('list', { name: 'Histórico da demanda' });
    for (const tipo of ['Início da fiscalização', 'Atividade', 'Fiscalização', 'Conclusão']) {
      expect(within(linha).getByText(tipo)).toBeInTheDocument();
    }
  }, 30000);

  it('valida o formulário de fiscalização e mostra erros por campo', async () => {
    const user = userEvent.setup();
    abrir(5);
    await user.click(await screen.findByRole('button', { name: 'Registrar fiscalização' }));
    const modal = await screen.findByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));
    expect(within(modal).getAllByText(/^Informe /)).toHaveLength(3);
    expect(within(modal).queryByLabelText(/^Recomendações/)).not.toBeRequired();

    fireEvent.change(within(modal).getByLabelText(/^Data da fiscalização/), {
      target: { value: '2099-01-01' },
    });
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));
    expect(within(modal).getByText('A data não pode ser futura.')).toBeInTheDocument();
  });

  it('envia o corpo da fiscalização ao contrato da API', async () => {
    let corpo;
    server.use(
      http.post('/api/demandas/:id/fiscalizacao', async ({ request }) => {
        corpo = await request.json();
        return HttpResponse.json({ status: 'AGUARDANDO_CONCLUSAO' });
      }),
    );
    const user = userEvent.setup();
    abrir(5);
    await user.click(await screen.findByRole('button', { name: 'Registrar fiscalização' }));
    const modal = await screen.findByRole('dialog');
    await user.type(within(modal).getByLabelText(/^Atividades realizadas/), 'A');
    await user.type(within(modal).getByLabelText(/^Resultado/), 'R');
    await user.type(within(modal).getByLabelText(/^Evidências/), 'E');
    await user.type(within(modal).getByLabelText(/^Recomendações/), 'Rec');
    await user.click(within(modal).getByRole('button', { name: 'Registrar fiscalização' }));
    await screen.findByText('Fiscalização registrada com sucesso.');
    expect(corpo).toMatchObject({
      atividades: 'A',
      resultado: 'R',
      evidencias: 'E',
      recomendacoes: 'Rec',
    });
    expect(corpo.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('devolve a demanda ao fiscal exigindo justificativa', async () => {
    const user = userEvent.setup();
    abrir(6);
    await user.click(await screen.findByRole('button', { name: 'Devolver' }));
    const modal = await screen.findByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: 'Devolver' }));
    expect(within(modal).getByText(/^Informe /)).toBeInTheDocument();
    await user.type(within(modal).getByLabelText(/^Justificativa/), 'Faltam fotos.');
    await user.click(within(modal).getByRole('button', { name: 'Devolver' }));
    expect(await screen.findByRole('button', { name: 'Registrar fiscalização' })).toBeVisible();
  });

  it('fiscal designado vê as ações de execução', async () => {
    iniciarSessao(FISCAL_3);
    abrir(5);
    expect(await screen.findByRole('button', { name: 'Registrar atividade' })).toBeInTheDocument();
    expect(botao('Registrar fiscalização')).toBeInTheDocument();
  });

  it('fiscal não designado não vê as ações', async () => {
    iniciarSessao({ ...FISCAL_3, id: 5 });
    abrir(5);
    await screen.findByRole('heading', { name: /DEM-2026\/0005/ });
    for (const nome of ['Registrar atividade', 'Registrar fiscalização', 'Iniciar execução']) {
      expect(botao(nome)).not.toBeInTheDocument();
    }
  });

  it('esconde conclusão e devolução de quem não é gestor/admin', async () => {
    iniciarSessao({ ...FISCAL_3, id: 5 });
    abrir(6);
    await screen.findByRole('heading', { name: /DEM-2026\/0006/ });
    expect(botao('Concluir demanda')).not.toBeInTheDocument();
    expect(botao('Devolver')).not.toBeInTheDocument();
  });

  it('exibe o 409 da API no modal de conclusão', async () => {
    server.use(
      http.post('/api/demandas/:id/conclusao', () =>
        HttpResponse.json(
          { title: 'Conflito', status: 409, detail: 'Sem registro de fiscalização.' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const user = userEvent.setup();
    abrir(6);
    await user.click(await screen.findByRole('button', { name: 'Concluir demanda' }));
    const modal = await screen.findByRole('dialog');
    await user.type(within(modal).getByLabelText(/^Resultado final/), 'x');
    await user.type(within(modal).getByLabelText(/^Justificativa/), 'y');
    await user.click(within(modal).getByRole('button', { name: 'Concluir' }));
    expect(await within(modal).findByRole('alert')).toHaveTextContent(
      'Sem registro de fiscalização.',
    );
  });
});
