import { useCallback, useState } from 'react';
import { listarUsuarios } from '../../../api/adminApi.js';
import { mensagemDeErro } from '../../../api/httpClient.js';
import { consultarAuditoria } from '../../../api/notificacoesApi.js';
import DataTable from '../../../components/DataTable.jsx';
import ErrorState from '../../../components/ErrorState.jsx';
import FilterBar from '../../../components/FilterBar.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import useCarregar from '../../../hooks/useCarregar.js';

const TAMANHO_PAGINA = 20;
const FILTROS_VAZIOS = { de: '', ate: '', usuarioId: '', acao: '', entidade: '' };

const COLUNAS = [
  {
    key: 'data',
    header: 'Data/hora',
    className: 'text-nowrap',
    render: (r) => new Date(r.data).toLocaleString('pt-BR'),
  },
  { key: 'usuarioNome', header: 'Usuário', render: (r) => r.usuarioNome ?? 'Sistema' },
  { key: 'acao', header: 'Ação' },
  { key: 'entidade', header: 'Entidade' },
  { key: 'entidadeId', header: 'Registro', render: (r) => r.entidadeId ?? '—' },
  { key: 'detalhe', header: 'Detalhe', render: (r) => r.detalhe ?? '—' },
];

/** Consulta de auditoria (somente ADMIN; a rota e a API exigem o perfil). */
export default function AuditoriaPage() {
  const [rascunho, setRascunho] = useState(FILTROS_VAZIOS);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(0);

  const carregar = useCallback(
    () => consultarAuditoria({ ...filtros, page: pagina, size: TAMANHO_PAGINA }),
    [filtros, pagina],
  );
  const { data, loading, error, recarregar } = useCarregar(carregar);
  const carregarUsuarios = useCallback(() => listarUsuarios({ size: 100 }), []);
  const usuarios = useCarregar(carregarUsuarios);

  const temFiltro = Object.values(filtros).some(Boolean);
  const definir = (campo) => (e) => setRascunho((r) => ({ ...r, [campo]: e.target.value }));
  const periodoInvalido = rascunho.de && rascunho.ate && rascunho.de > rascunho.ate;

  return (
    <>
      <PageHeader
        module="Core"
        title="Auditoria"
        description="Histórico das operações realizadas no sistema, mais recentes primeiro. Dados fictícios de demonstração."
      />

      <FilterBar
        label="Filtros de auditoria"
        onSubmit={() => {
          if (periodoInvalido) return;
          setFiltros(rascunho);
          setPagina(0);
        }}
        onClear={() => {
          setRascunho(FILTROS_VAZIOS);
          setFiltros(FILTROS_VAZIOS);
          setPagina(0);
        }}
      >
        <div className="col-6 col-lg-2">
          <label htmlFor="aud-de" className="form-label small mb-1">
            De
          </label>
          <input
            id="aud-de"
            type="date"
            className="form-control"
            value={rascunho.de}
            onChange={definir('de')}
          />
        </div>
        <div className="col-6 col-lg-2">
          <label htmlFor="aud-ate" className="form-label small mb-1">
            Até
          </label>
          <input
            id="aud-ate"
            type="date"
            className={`form-control ${periodoInvalido ? 'is-invalid' : ''}`}
            value={rascunho.ate}
            onChange={definir('ate')}
          />
          {periodoInvalido && (
            <div className="invalid-feedback">
              A data final deve ser igual ou posterior à inicial.
            </div>
          )}
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <label htmlFor="aud-usuario" className="form-label small mb-1">
            Usuário
          </label>
          <select
            id="aud-usuario"
            className="form-select"
            value={rascunho.usuarioId}
            onChange={definir('usuarioId')}
          >
            <option value="">Todos</option>
            {(usuarios.data?.content ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-lg-2">
          <label htmlFor="aud-acao" className="form-label small mb-1">
            Ação
          </label>
          <input
            id="aud-acao"
            type="text"
            className="form-control"
            value={rascunho.acao}
            onChange={definir('acao')}
          />
        </div>
        <div className="col-6 col-lg-2">
          <label htmlFor="aud-entidade" className="form-label small mb-1">
            Entidade
          </label>
          <input
            id="aud-entidade"
            type="text"
            className="form-control"
            value={rascunho.entidade}
            onChange={definir('entidade')}
          />
        </div>
      </FilterBar>

      {error && !loading ? (
        <ErrorState
          title="Não foi possível carregar a auditoria"
          message={mensagemDeErro(error)}
          onRetry={recarregar}
        />
      ) : (
        <DataTable
          caption="Registros de auditoria"
          columns={COLUNAS}
          rows={data?.content ?? []}
          loading={loading}
          emptyTitle="Nenhum registro encontrado"
          emptyMessage={
            temFiltro
              ? 'Nenhum registro corresponde aos filtros. Ajuste ou limpe os filtros.'
              : 'Ainda não há registros de auditoria.'
          }
          pagination={{
            page: data?.page ?? 0,
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements,
            onPageChange: setPagina,
          }}
        />
      )}
    </>
  );
}
