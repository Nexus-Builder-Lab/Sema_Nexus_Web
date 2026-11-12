import { useState } from 'react';
import { listarSetores, listarUsuarios } from '../../../api/adminApi.js';
import { listarEquipes, listarMembros } from '../../../api/catalogosApi.js';
import { mensagemDeErro } from '../../../api/httpClient.js';
import DataTable from '../../../components/DataTable.jsx';
import ErrorState from '../../../components/ErrorState.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import { useToast } from '../../../components/Toasts.jsx';
import useCarregar from '../../../hooks/useCarregar.js';
import { EquipeModal, MembrosModal, SetorModal } from './EstruturaModais.jsx';

const situacao = (ativo) => (
  <span className={`nx-badge ${ativo ? 'nx-badge-green' : 'nx-badge-gray'}`}>
    {ativo ? 'Ativo' : 'Inativo'}
  </span>
);

// Lista curta de usuários para escolher responsável e membros (a API limita size a 100).
const carregarUsuarios = async () => (await listarUsuarios({ size: 100 })).content;

export default function EstruturaPage() {
  const { showToast } = useToast();
  const setores = useCarregar(listarSetores);
  const equipes = useCarregar(listarEquipes);
  const usuarios = useCarregar(carregarUsuarios);
  const [modal, setModal] = useState(null); // { tipo, item, membrosIds }

  async function aoSalvar(mensagem) {
    setModal(null);
    showToast({ message: mensagem, variant: 'success' });
    setores.recarregar();
    equipes.recarregar();
  }

  async function abrirMembros(equipe) {
    try {
      const membros = await listarMembros(equipe.id);
      setModal({ tipo: 'membros', item: equipe, membrosIds: membros.map((m) => m.id) });
    } catch (erro) {
      showToast({
        message: mensagemDeErro(erro, 'Não foi possível carregar os membros.'),
        variant: 'danger',
      });
    }
  }

  const colunasSetor = [
    { key: 'sigla', header: 'Sigla' },
    { key: 'nome', header: 'Nome' },
    { key: 'ativo', header: 'Situação', render: (s) => situacao(s.ativo) },
    {
      key: 'acoes',
      header: <span className="visually-hidden">Ações</span>,
      className: 'text-end',
      render: (s) => (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          aria-label={`Editar setor ${s.sigla}`}
          onClick={() => setModal({ tipo: 'setor', item: s })}
        >
          Editar
        </button>
      ),
    },
  ];

  const colunasEquipe = [
    { key: 'nome', header: 'Equipe' },
    { key: 'setorSigla', header: 'Setor', render: (e) => e.setorSigla ?? '—' },
    { key: 'responsavel', header: 'Responsável', render: (e) => e.responsavel?.nome ?? '—' },
    { key: 'totalMembros', header: 'Membros' },
    { key: 'ativo', header: 'Situação', render: (e) => situacao(e.ativo) },
    {
      key: 'acoes',
      header: <span className="visually-hidden">Ações</span>,
      className: 'text-end text-nowrap',
      render: (e) => (
        <div className="d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            aria-label={`Membros de ${e.nome}`}
            onClick={() => abrirMembros(e)}
          >
            Membros
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            aria-label={`Editar equipe ${e.nome}`}
            onClick={() => setModal({ tipo: 'equipe', item: e })}
          >
            Editar
          </button>
        </div>
      ),
    },
  ];

  const secao = (estado, titulo, erroTitulo) =>
    estado.error && !estado.loading ? (
      <ErrorState
        title={erroTitulo}
        message={mensagemDeErro(estado.error)}
        onRetry={estado.recarregar}
      />
    ) : (
      titulo
    );

  return (
    <>
      <PageHeader
        module="Core"
        title="Setores e equipes"
        description="Estrutura organizacional, membros e responsáveis. Dados fictícios de demonstração."
      />

      <section aria-labelledby="titulo-setores" className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0" id="titulo-setores">
            Setores
          </h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setModal({ tipo: 'setor', item: null })}
          >
            Novo setor
          </button>
        </div>
        {secao(
          setores,
          <DataTable
            caption="Lista de setores"
            columns={colunasSetor}
            rows={setores.data ?? []}
            loading={setores.loading}
            emptyTitle="Nenhum setor cadastrado"
            emptyMessage="Cadastre o primeiro setor."
          />,
          'Não foi possível carregar os setores',
        )}
      </section>

      <section aria-labelledby="titulo-equipes">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h5 mb-0" id="titulo-equipes">
            Equipes
          </h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setModal({ tipo: 'equipe', item: null })}
          >
            Nova equipe
          </button>
        </div>
        {secao(
          equipes,
          <DataTable
            caption="Lista de equipes"
            columns={colunasEquipe}
            rows={equipes.data ?? []}
            loading={equipes.loading}
            emptyTitle="Nenhuma equipe cadastrada"
            emptyMessage="Cadastre a primeira equipe."
          />,
          'Não foi possível carregar as equipes',
        )}
      </section>

      {modal?.tipo === 'setor' && (
        <SetorModal setor={modal.item} onClose={() => setModal(null)} onSalvo={aoSalvar} />
      )}
      {modal?.tipo === 'equipe' && (
        <EquipeModal
          equipe={modal.item}
          setores={setores.data ?? []}
          usuarios={usuarios.data ?? []}
          onClose={() => setModal(null)}
          onSalvo={aoSalvar}
        />
      )}
      {modal?.tipo === 'membros' && (
        <MembrosModal
          equipe={modal.item}
          usuarios={usuarios.data ?? []}
          membrosIds={modal.membrosIds}
          onClose={() => setModal(null)}
          onSalvo={aoSalvar}
        />
      )}
    </>
  );
}
