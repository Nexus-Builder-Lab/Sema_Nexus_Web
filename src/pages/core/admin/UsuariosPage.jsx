import { useCallback, useMemo, useState } from 'react';
import { alterarAtivacao, listarSetores, listarUsuarios } from '../../../api/adminApi.js';
import { listarEquipes, listarMembros } from '../../../api/catalogosApi.js';
import { mensagemDeErro } from '../../../api/httpClient.js';
import ConfirmDialog from '../../../components/ConfirmDialog.jsx';
import DataTable from '../../../components/DataTable.jsx';
import ErrorState from '../../../components/ErrorState.jsx';
import FilterBar from '../../../components/FilterBar.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import { useToast } from '../../../components/Toasts.jsx';
import useCarregar from '../../../hooks/useCarregar.js';
import UsuarioModal from './UsuarioModal.jsx';
import { PERFIS, rotuloPerfil } from './validarAdmin.js';

const TAMANHO_PAGINA = 20;
const FILTROS_VAZIOS = { q: '', perfil: '', ativo: '' };

/** Equipes ativas e inativas com os ids de seus membros (lista curta; só ADMIN/GESTOR). */
async function carregarEquipesComMembros() {
  const equipes = await listarEquipes();
  const membros = await Promise.all(equipes.map((e) => listarMembros(e.id)));
  const membrosPorEquipe = Object.fromEntries(
    equipes.map((e, i) => [e.id, membros[i].map((m) => m.id)]),
  );
  return { equipes, membrosPorEquipe };
}

export default function UsuariosPage({ embedded = false }) {
  const { showToast } = useToast();
  const [rascunho, setRascunho] = useState(FILTROS_VAZIOS);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState(null); // { usuario } (null = novo)
  const [desativar, setDesativar] = useState(null);
  const [alterando, setAlterando] = useState(false);

  const carregar = useCallback(
    () => listarUsuarios({ ...filtros, page: pagina, size: TAMANHO_PAGINA }),
    [filtros, pagina],
  );
  const { data, loading, error, recarregar } = useCarregar(carregar);
  const setores = useCarregar(listarSetores);
  const estrutura = useCarregar(carregarEquipesComMembros);

  const equipesDoUsuario = useCallback(
    (usuarioId) =>
      (estrutura.data?.equipes ?? []).filter((e) =>
        (estrutura.data.membrosPorEquipe[e.id] ?? []).includes(usuarioId),
      ),
    [estrutura.data],
  );

  async function alternar(usuario, ativo) {
    setAlterando(true);
    try {
      await alterarAtivacao(usuario.id, ativo);
      showToast({
        message: ativo ? 'Usuário ativado.' : 'Usuário desativado.',
        variant: 'success',
      });
      setDesativar(null);
      recarregar();
    } catch (erro) {
      setDesativar(null);
      showToast({
        message: mensagemDeErro(erro, 'Não foi possível alterar o usuário.'),
        variant: 'danger',
      });
    } finally {
      setAlterando(false);
    }
  }

  async function aoSalvar(mensagem, aviso) {
    setModal(null);
    showToast({ message: mensagem, variant: 'success' });
    if (aviso) showToast({ message: aviso, variant: 'warning' });
    recarregar();
    estrutura.recarregar();
  }

  const colunas = useMemo(
    () => [
      { key: 'nome', header: 'Nome' },
      { key: 'email', header: 'E-mail' },
      { key: 'perfil', header: 'Perfil', render: (u) => rotuloPerfil(u.perfil) },
      { key: 'setor', header: 'Setor', render: (u) => u.setorSigla ?? '—' },
      {
        key: 'equipe',
        header: 'Equipe',
        render: (u) => {
          const nomes = equipesDoUsuario(u.id).map((e) => e.nome);
          return nomes.length ? nomes.join(', ') : '—';
        },
      },
      {
        key: 'ativo',
        header: 'Situação',
        render: (u) => (
          <span className={`nx-badge ${u.ativo ? 'nx-badge-green' : 'nx-badge-gray'}`}>
            {u.ativo ? 'Ativo' : 'Inativo'}
          </span>
        ),
      },
      {
        key: 'acoes',
        header: <span className="visually-hidden">Ações</span>,
        className: 'text-end text-nowrap',
        render: (u) => (
          <div className="d-flex gap-2 justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              aria-label={`Editar ${u.nome}`}
              onClick={() => setModal({ usuario: u })}
            >
              Editar
            </button>
            {u.ativo ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                aria-label={`Desativar ${u.nome}`}
                onClick={() => setDesativar(u)}
              >
                Desativar
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                aria-label={`Ativar ${u.nome}`}
                onClick={() => alternar(u, true)}
                disabled={alterando}
              >
                Ativar
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipesDoUsuario, alterando],
  );

  const temFiltro = Boolean(filtros.q || filtros.perfil || filtros.ativo);
  const definir = (campo) => (e) => setRascunho((r) => ({ ...r, [campo]: e.target.value }));

  const botaoNovo = (
    <button type="button" className="btn btn-primary" onClick={() => setModal({ usuario: null })}>
      Novo usuário
    </button>
  );

  return (
    <>
      {embedded ? (
        <div className="d-flex justify-content-end mb-3">{botaoNovo}</div>
      ) : (
        <PageHeader
          module="Core"
          title="Usuários"
          description="Cadastre e mantenha os usuários e suas equipes. Dados fictícios de demonstração."
          actions={botaoNovo}
        />
      )}

      <FilterBar
        label="Filtros de usuários"
        onSubmit={() => {
          setFiltros(rascunho);
          setPagina(0);
        }}
        onClear={() => {
          setRascunho(FILTROS_VAZIOS);
          setFiltros(FILTROS_VAZIOS);
          setPagina(0);
        }}
      >
        <div className="col-12 col-lg-5">
          <label htmlFor="filtro-usuario-q" className="form-label small mb-1">
            Pesquisar por nome ou e-mail
          </label>
          <input
            id="filtro-usuario-q"
            type="search"
            className="form-control"
            value={rascunho.q}
            onChange={definir('q')}
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <label htmlFor="filtro-usuario-perfil" className="form-label small mb-1">
            Perfil
          </label>
          <select
            id="filtro-usuario-perfil"
            className="form-select"
            value={rascunho.perfil}
            onChange={definir('perfil')}
          >
            <option value="">Todos</option>
            {PERFIS.map((p) => (
              <option key={p.codigo} value={p.codigo}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <label htmlFor="filtro-usuario-ativo" className="form-label small mb-1">
            Situação
          </label>
          <select
            id="filtro-usuario-ativo"
            className="form-select"
            value={rascunho.ativo}
            onChange={definir('ativo')}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </FilterBar>

      {error && !loading ? (
        <ErrorState
          title="Não foi possível carregar os usuários"
          message={mensagemDeErro(error)}
          onRetry={recarregar}
        />
      ) : (
        <DataTable
          caption="Lista de usuários"
          columns={colunas}
          rows={data?.content ?? []}
          loading={loading}
          emptyTitle="Nenhum usuário encontrado"
          emptyMessage={
            temFiltro
              ? 'Nenhum usuário corresponde aos filtros. Ajuste ou limpe os filtros.'
              : 'Ainda não há usuários cadastrados.'
          }
          pagination={{
            page: data?.page ?? 0,
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements,
            onPageChange: setPagina,
          }}
        />
      )}

      {modal && (
        <UsuarioModal
          usuario={modal.usuario}
          setores={setores.data ?? []}
          equipes={estrutura.data?.equipes ?? []}
          equipesAtuais={modal.usuario ? equipesDoUsuario(modal.usuario.id).map((e) => e.id) : []}
          membrosPorEquipe={estrutura.data?.membrosPorEquipe ?? {}}
          onClose={() => setModal(null)}
          onSalvo={aoSalvar}
        />
      )}

      <ConfirmDialog
        show={Boolean(desativar)}
        title="Desativar usuário"
        message={
          desativar && (
            <>
              Desativar <strong>{desativar.nome}</strong>? O usuário deixa de acessar o sistema e de
              aparecer na distribuição de demandas. Você pode reativá-lo depois.
            </>
          )
        }
        confirmLabel="Desativar"
        busy={alterando}
        onConfirm={() => alternar(desativar, false)}
        onCancel={() => setDesativar(null)}
      />
    </>
  );
}
