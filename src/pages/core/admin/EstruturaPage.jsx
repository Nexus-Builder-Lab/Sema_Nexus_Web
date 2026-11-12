import { Building2, Pencil, Plus, Power } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { atualizarSetor, listarSetores, listarUsuarios } from '../../../api/adminApi.js';
import { obterProdutividade } from '../../../api/fluxApi.js';
import EmptyState from '../../../components/EmptyState.jsx';
import Loading from '../../../components/Loading.jsx';
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

// Contagens por setor vêm do painel de produtividade; sem permissão, o cartão omite as contagens.
const carregarContagens = async () => {
  try {
    return (await obterProdutividade()).porSetorSituacao ?? [];
  } catch {
    return [];
  }
};

const iniciais = (nome) =>
  nome
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || nome[0].toUpperCase();

function SetorCard({ setor, responsavel, membros, contagem, onEditar, onAlternar }) {
  return (
    <article className={`nx-setor-card${setor.ativo ? '' : ' is-inativo'}`}>
      <div className="nx-setor-head">
        <span className="nx-setor-icon" aria-hidden="true">
          <Building2 size={18} />
        </span>
        <div>
          <h3 className="nx-setor-sigla">{setor.sigla}</h3>
          <p className="nx-setor-nome">{setor.nome}</p>
        </div>
        {!setor.ativo && <span className="nx-badge nx-badge-gray ms-auto">Inativo</span>}
      </div>
      <p className="nx-setor-resp">
        Responsável: <strong>{responsavel ?? '—'}</strong>
      </p>
      <div className="nx-setor-meta">
        <span className="nx-setor-membros">
          {membros.slice(0, 3).map((m) => (
            <span key={m.id} className="nx-setor-avatar" title={m.nome}>
              {iniciais(m.nome)}
            </span>
          ))}
        </span>
        <span className="text-muted small">
          {membros.length} {membros.length === 1 ? 'servidor' : 'servidores'}
        </span>
      </div>
      {contagem && (
        <div className="d-flex gap-2 flex-wrap">
          <span className="nx-badge nx-badge-blue">{contagem.ativas} ativas</span>
          {contagem.atrasadas > 0 && (
            <span className="nx-badge nx-badge-red">{contagem.atrasadas} vencidas</span>
          )}
        </div>
      )}
      <div className="nx-setor-acoes">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          aria-label={`Editar setor ${setor.sigla}`}
          onClick={onEditar}
        >
          <Pencil size={14} aria-hidden="true" /> Editar
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          aria-label={`${setor.ativo ? 'Desativar' : 'Reativar'} setor ${setor.sigla}`}
          onClick={onAlternar}
        >
          <Power size={14} aria-hidden="true" /> {setor.ativo ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    </article>
  );
}

export default function EstruturaPage() {
  const { showToast } = useToast();
  const setores = useCarregar(listarSetores);
  const equipes = useCarregar(listarEquipes);
  const usuarios = useCarregar(carregarUsuarios);
  const contagens = useCarregar(carregarContagens);
  const [aba, setAba] = useState('setores');
  const [modal, setModal] = useState(null); // { tipo, item, membrosIds }

  async function aoSalvar(mensagem) {
    setModal(null);
    showToast({ message: mensagem, variant: 'success' });
    setores.recarregar();
    equipes.recarregar();
  }

  async function alternarSetor(s) {
    try {
      await atualizarSetor(s.id, { sigla: s.sigla, nome: s.nome, ativo: !s.ativo });
      showToast({
        message: s.ativo ? 'Setor desativado.' : 'Setor reativado.',
        variant: 'success',
      });
      setores.recarregar();
    } catch (erro) {
      showToast({
        message: mensagemDeErro(erro, 'Não foi possível alterar o setor.'),
        variant: 'danger',
      });
    }
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
        module="Flux"
        title="Setores e equipes"
        description="Estrutura organizacional, membros e responsáveis. Dados fictícios de demonstração."
      />

      <ul className="nav nx-tabs mb-3" role="tablist">
        {[
          ['setores', 'Setores', setores.data?.length],
          ['equipes', 'Equipes', equipes.data?.length],
          ['usuarios', 'Usuários', usuarios.data?.length],
        ].map(([id, rotulo, n]) => (
          <li key={id} className="nav-item" role="presentation">
            <button
              type="button"
              role="tab"
              id={`aba-${id}`}
              aria-selected={aba === id}
              aria-controls={`painel-${id}`}
              className={`nav-link${aba === id ? ' active' : ''}`}
              onClick={() => setAba(id)}
            >
              {rotulo} {n != null && <span className="nx-badge nx-badge-gray">{n}</span>}
            </button>
          </li>
        ))}
      </ul>

      {aba === 'setores' && (
        <section id="painel-setores" role="tabpanel" aria-labelledby="aba-setores">
          <div className="d-flex justify-content-end mb-3">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setModal({ tipo: 'setor', item: null })}
            >
              <Plus size={14} aria-hidden="true" /> Novo setor
            </button>
          </div>
          {secao(
            setores,
            setores.loading ? (
              <Loading message="Carregando setores..." />
            ) : !(setores.data ?? []).length ? (
              <EmptyState title="Nenhum setor cadastrado" message="Cadastre o primeiro setor." />
            ) : (
              <div className="nx-setor-grid">
                {setores.data.map((s) => {
                  const doSetor = (usuarios.data ?? []).filter((u) => u.setorId === s.id);
                  const eq = (equipes.data ?? []).find((e) => e.setorId === s.id && e.responsavel);
                  return (
                    <SetorCard
                      key={s.id}
                      setor={s}
                      responsavel={eq?.responsavel?.nome}
                      membros={doSetor}
                      contagem={(contagens.data ?? []).find((c) => c.setorId === s.id)}
                      onEditar={() => setModal({ tipo: 'setor', item: s })}
                      onAlternar={() => alternarSetor(s)}
                    />
                  );
                })}
              </div>
            ),
            'Não foi possível carregar os setores',
          )}
        </section>
      )}

      {aba === 'equipes' && (
        <section id="painel-equipes" role="tabpanel" aria-labelledby="aba-equipes">
          <div className="d-flex justify-content-end mb-3">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setModal({ tipo: 'equipe', item: null })}
            >
              <Plus size={14} aria-hidden="true" /> Nova equipe
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
      )}

      {aba === 'usuarios' && (
        <section id="painel-usuarios" role="tabpanel" aria-labelledby="aba-usuarios">
          <p className="text-muted">
            Os usuários e perfis são gerenciados na tela <Link to="/admin/usuarios">Usuários</Link>.
          </p>
        </section>
      )}

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
