import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarMembros, listarEquipes } from '../../api/catalogosApi.js';
import { listarDemandas } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { podeEditarDemandas, STATUS_EDITAVEIS } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import DataTable from '../../components/DataTable.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { carregarCatalogosFlux, rotuloDoCatalogo } from './catalogosFlux.js';

const TAMANHO_PAGINA = 20;
const ORDEM_PADRAO = 'numero,desc';
const CAMPOS_FILTRO = [
  'q',
  'municipioId',
  'categoria',
  'prioridade',
  'status',
  'equipeId',
  'fiscalId',
  'de',
  'ate',
];

function filtrosDaUrl(searchParams) {
  return Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, searchParams.get(campo) ?? '']));
}

function Campo({ id, label, className = 'col-12 col-sm-6 col-lg-3', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label small mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectCatalogo({ id, valor, itens = [], onChange, vazio = 'Todos', disabled }) {
  return (
    <select
      id={id}
      className="form-select"
      value={valor}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{vazio}</option>
      {itens.map((item) => (
        <option key={item.codigo ?? item.id} value={item.codigo ?? item.id}>
          {item.rotulo ?? item.nome}
        </option>
      ))}
    </select>
  );
}

/** Filtros da listagem. O rascunho só vai para a URL ao enviar (Filtrar). */
function FiltrosDemanda({ inicial, catalogos, equipes, onAplicar, onLimpar }) {
  const [rascunho, setRascunho] = useState(inicial);
  const definir = (campo) => (valor) => setRascunho((atual) => ({ ...atual, [campo]: valor }));

  const carregarFiscais = useCallback(
    () => (rascunho.equipeId ? listarMembros(rascunho.equipeId) : Promise.resolve([])),
    [rascunho.equipeId],
  );
  const { data: membros } = useCarregar(carregarFiscais);
  const fiscais = (membros ?? []).filter((m) => m.perfil === 'FISCAL' && m.ativo);

  function trocarEquipe(valor) {
    setRascunho((atual) => ({ ...atual, equipeId: valor, fiscalId: '' }));
  }

  return (
    <FilterBar
      label="Filtros de demandas"
      onSubmit={() => onAplicar(rascunho)}
      onClear={() => {
        setRascunho(Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, ''])));
        onLimpar();
      }}
    >
      <Campo id="filtro-q" label="Pesquisar por número ou título" className="col-12 col-lg-6">
        <input
          id="filtro-q"
          type="search"
          className="form-control"
          placeholder="Ex.: DEM-2026/0010 ou parte do título"
          value={rascunho.q}
          onChange={(e) => definir('q')(e.target.value)}
        />
      </Campo>
      <Campo id="filtro-municipio" label="Município">
        <SelectCatalogo
          id="filtro-municipio"
          valor={rascunho.municipioId}
          itens={(catalogos?.municipios ?? []).map((m) => ({ id: m.id, nome: m.nome }))}
          onChange={definir('municipioId')}
        />
      </Campo>
      <Campo id="filtro-categoria" label="Categoria">
        <SelectCatalogo
          id="filtro-categoria"
          valor={rascunho.categoria}
          itens={catalogos?.categorias}
          onChange={definir('categoria')}
        />
      </Campo>
      <Campo id="filtro-prioridade" label="Prioridade">
        <SelectCatalogo
          id="filtro-prioridade"
          valor={rascunho.prioridade}
          itens={catalogos?.prioridades}
          onChange={definir('prioridade')}
        />
      </Campo>
      <Campo id="filtro-status" label="Status">
        <SelectCatalogo
          id="filtro-status"
          valor={rascunho.status}
          itens={catalogos?.status}
          onChange={definir('status')}
        />
      </Campo>
      {equipes && (
        <>
          <Campo id="filtro-equipe" label="Equipe responsável">
            <SelectCatalogo
              id="filtro-equipe"
              valor={rascunho.equipeId}
              itens={equipes.map((e) => ({ id: e.id, nome: e.nome }))}
              onChange={trocarEquipe}
            />
          </Campo>
          <Campo id="filtro-fiscal" label="Fiscal responsável">
            <SelectCatalogo
              id="filtro-fiscal"
              valor={rascunho.fiscalId}
              itens={fiscais.map((f) => ({ id: f.id, nome: f.nome }))}
              onChange={definir('fiscalId')}
              vazio={rascunho.equipeId ? 'Todos' : 'Selecione a equipe'}
              disabled={!rascunho.equipeId}
            />
          </Campo>
        </>
      )}
      <Campo id="filtro-de" label="Recebida de">
        <input
          id="filtro-de"
          type="date"
          className="form-control"
          value={rascunho.de}
          onChange={(e) => definir('de')(e.target.value)}
        />
      </Campo>
      <Campo id="filtro-ate" label="Recebida até">
        <input
          id="filtro-ate"
          type="date"
          className="form-control"
          value={rascunho.ate}
          onChange={(e) => definir('ate')(e.target.value)}
        />
      </Campo>
    </FilterBar>
  );
}

const carregarEquipesSePermitido = () => listarEquipes().catch(() => null);

export default function DemandasListPage() {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const podeEditar = podeEditarDemandas(usuario);

  const { data: catalogos } = useCarregar(carregarCatalogosFlux);
  // Equipes são restritas a ADMIN/GESTOR na API: para os demais, o filtro simplesmente não aparece.
  const { data: equipes } = useCarregar(carregarEquipesSePermitido);

  const filtros = filtrosDaUrl(searchParams);
  const pagina = Math.max(0, Number(searchParams.get('page')) || 0);
  const ordem = searchParams.get('sort') || ORDEM_PADRAO;
  const [campoOrdem, direcaoOrdem] = ordem.split(',');
  const chaveFiltros = CAMPOS_FILTRO.map((campo) => searchParams.get(campo) ?? '').join('|');

  const carregar = useCallback(
    () => listarDemandas({ ...filtros, page: pagina, size: TAMANHO_PAGINA, sort: ordem }),
    // `filtros` é derivado de `chaveFiltros`; usar a chave evita refazer a busca a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chaveFiltros, pagina, ordem],
  );
  const { data, loading, error, recarregar } = useCarregar(carregar);

  function atualizarUrl(mudancas) {
    const proximo = new URLSearchParams(searchParams);
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === '' || valor == null) proximo.delete(chave);
      else proximo.set(chave, String(valor));
    }
    setSearchParams(proximo);
  }

  const colunas = useMemo(
    () => [
      {
        key: 'numero',
        header: 'Número',
        sortable: true,
        className: 'text-nowrap',
        render: (d) => <Link to={`/flux/demandas/${d.id}`}>{d.numero}</Link>,
      },
      { key: 'titulo', header: 'Título', sortable: true },
      { key: 'municipio', header: 'Município', render: (d) => d.municipio?.nome ?? '—' },
      {
        key: 'categoria',
        header: 'Categoria',
        render: (d) => rotuloDoCatalogo(catalogos?.categorias, d.categoria),
      },
      {
        key: 'prioridade',
        header: 'Prioridade',
        sortable: true,
        render: (d) => (d.prioridade ? <PriorityBadge prioridade={d.prioridade} /> : '—'),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (d) => <StatusBadge status={d.status} />,
      },
      {
        key: 'prazo',
        header: 'Prazo',
        sortable: true,
        className: 'text-nowrap',
        render: (d) => (
          <>
            {formatarData(d.prazo)}
            {d.atrasada && <span className="nx-badge nx-badge-red ms-2">Atrasada</span>}
          </>
        ),
      },
      ...(podeEditar
        ? [
            {
              key: 'acoes',
              header: <span className="visually-hidden">Ações</span>,
              className: 'text-end text-nowrap',
              render: (d) =>
                STATUS_EDITAVEIS.includes(d.status) ? (
                  <Link
                    to={`/flux/demandas/${d.id}/editar`}
                    className="btn btn-sm btn-outline-secondary"
                    aria-label={`Editar ${d.numero}`}
                  >
                    Editar
                  </Link>
                ) : null,
            },
          ]
        : []),
    ],
    [catalogos, podeEditar],
  );

  const temFiltro = CAMPOS_FILTRO.some((campo) => filtros[campo]);

  return (
    <>
      <PageHeader
        module="Flux"
        title="Demandas de fiscalização"
        description="Pesquise, filtre e acompanhe as demandas. Dados fictícios de demonstração."
        actions={
          podeEditar && (
            <Link to="/flux/demandas/nova" className="btn btn-primary">
              Nova demanda
            </Link>
          )
        }
      />

      <FiltrosDemanda
        key={chaveFiltros}
        inicial={filtros}
        catalogos={catalogos}
        equipes={equipes}
        onAplicar={(rascunho) => atualizarUrl({ ...rascunho, page: '' })}
        onLimpar={() => setSearchParams(new URLSearchParams())}
      />

      {error && !loading ? (
        <ErrorState
          title="Não foi possível carregar as demandas"
          message={mensagemDeErro(error)}
          onRetry={recarregar}
        />
      ) : (
        <DataTable
          caption="Lista de demandas de fiscalização"
          columns={colunas}
          rows={data?.content ?? []}
          loading={loading}
          emptyTitle="Nenhuma demanda encontrada"
          emptyMessage={
            temFiltro
              ? 'Nenhuma demanda corresponde aos filtros. Ajuste ou limpe os filtros.'
              : 'Ainda não há demandas cadastradas.'
          }
          sort={{ key: campoOrdem, direction: direcaoOrdem === 'desc' ? 'desc' : 'asc' }}
          onSortChange={({ key, direction }) =>
            atualizarUrl({ sort: `${key},${direction}`, page: '' })
          }
          pagination={{
            page: data?.page ?? 0,
            totalPages: data?.totalPages ?? 0,
            totalElements: data?.totalElements,
            onPageChange: (p) => atualizarUrl({ page: p || '' }),
          }}
        />
      )}
    </>
  );
}
