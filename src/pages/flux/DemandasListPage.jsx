import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarMembros, listarEquipes } from '../../api/catalogosApi.js';
import { listarDemandas } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { obterPorSituacao, obterResumo } from '../../api/intelligenceApi.js';
import { baixarEGuardarCsv } from '../../api/relatoriosApi.js';
import { PERFIS_RELATORIOS, podeEditarDemandas, STATUS_EDITAVEIS } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import DataTable from '../../components/DataTable.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { diasEntre, formatarData, hojeISO } from '../../utils/datas.js';
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
  'atrasada', // só por URL (atalho da Sentinela); a API aceita `atrasada=true`
  'de',
  'ate',
];

function filtrosDaUrl(searchParams) {
  const filtros = Object.fromEntries(
    CAMPOS_FILTRO.map((campo) => [campo, searchParams.get(campo) ?? '']),
  );
  // `atrasada` só vale como "true" (atalho da Sentinela); qualquer outro valor é ignorado.
  if (filtros.atrasada !== 'true') filtros.atrasada = '';
  return filtros;
}

function Campo({ id, label, className = 'col-12 col-sm-6 col-lg-auto', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="visually-hidden">
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
      className="nx-demandas-filtros"
      label="Filtros de demandas"
      onSubmit={() => onAplicar(rascunho)}
      onClear={() => {
        setRascunho(Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, ''])));
        onLimpar();
      }}
    >
      <Campo id="filtro-q" label="Pesquisar por número ou título" className="col-12 col-lg-4">
        <input
          id="filtro-q"
          type="search"
          className="form-control"
          placeholder="Pesquisar por número, título..."
          value={rascunho.q}
          onChange={(e) => definir('q')(e.target.value)}
        />
      </Campo>
      <Campo id="filtro-municipio" label="Município">
        <SelectCatalogo
          id="filtro-municipio"
          vazio="Todos os municípios"
          valor={rascunho.municipioId}
          itens={(catalogos?.municipios ?? []).map((m) => ({ id: m.id, nome: m.nome }))}
          onChange={definir('municipioId')}
        />
      </Campo>
      <Campo id="filtro-categoria" label="Categoria">
        <SelectCatalogo
          id="filtro-categoria"
          vazio="Todas as categorias"
          valor={rascunho.categoria}
          itens={catalogos?.categorias}
          onChange={definir('categoria')}
        />
      </Campo>
      <Campo id="filtro-prioridade" label="Prioridade">
        <SelectCatalogo
          id="filtro-prioridade"
          vazio="Todas as prioridades"
          valor={rascunho.prioridade}
          itens={catalogos?.prioridades}
          onChange={definir('prioridade')}
        />
      </Campo>
      <Campo id="filtro-status" label="Status">
        <SelectCatalogo
          id="filtro-status"
          vazio="Todas as situações"
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
              vazio="Todas as equipes"
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

/** Nota do prazo: "No prazo (N dias)" / "Vencida há N dias"; finalizada mostra só "Concluída". */
function PrazoNota({ demanda }) {
  if (demanda.status === 'FINALIZADA') return <div className="nx-prazo-ok">Concluída</div>;
  const dias = diasEntre(hojeISO(), demanda.prazo);
  if (demanda.atrasada || dias < 0) {
    const n = Math.abs(dias);
    return (
      <div className="nx-prazo-venc">
        Vencida há {n} {n === 1 ? 'dia' : 'dias'}
      </div>
    );
  }
  return (
    <div className="nx-prazo-ok">
      No prazo ({dias} {dias === 1 ? 'dia' : 'dias'})
    </div>
  );
}

// Indicadores por situação; se a API negar (ex.: perfil sem acesso), os cartões mostram "—".
async function carregarIndicadores() {
  try {
    const [resumo, situacoes] = await Promise.all([obterResumo(), obterPorSituacao()]);
    const por = (codigo) => situacoes?.itens?.find((i) => i.codigo === codigo)?.total;
    return {
      total: resumo.totalDemandas,
      abertas: por('PENDENTE'),
      emTriagem: por('EM_TRIAGEM'),
      emAndamento: resumo.emAndamento,
      finalizadas: resumo.finalizadas,
      vencidas: resumo.atrasadas,
    };
  } catch {
    return null;
  }
}

const carregarEquipesSePermitido = () => listarEquipes().catch(() => null);

export default function DemandasListPage() {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const podeEditar = podeEditarDemandas(usuario);
  const podeExportar = PERFIS_RELATORIOS.includes(usuario?.perfil);
  const [exportando, setExportando] = useState(false);
  const [erroExport, setErroExport] = useState(null);

  const { data: catalogos } = useCarregar(carregarCatalogosFlux);
  // Equipes são restritas a ADMIN/GESTOR na API: para os demais, o filtro simplesmente não aparece.
  const { data: equipes } = useCarregar(carregarEquipesSePermitido);
  const { data: ind, loading: carregandoInd } = useCarregar(carregarIndicadores);

  const filtros = filtrosDaUrl(searchParams);
  const pagina = Math.max(0, Number(searchParams.get('page')) || 0);
  const ordem = searchParams.get('sort') || ORDEM_PADRAO;
  const [campoOrdem, direcaoOrdem] = ordem.split(',');
  const chaveFiltros = CAMPOS_FILTRO.map((campo) => filtros[campo]).join('|');

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

  async function exportar() {
    setExportando(true);
    setErroExport(null);
    try {
      await baixarEGuardarCsv({
        de: filtros.de,
        ate: filtros.ate,
        municipioId: filtros.municipioId,
        categoria: filtros.categoria,
        status: filtros.status,
      });
    } catch (e) {
      setErroExport(mensagemDeErro(e));
    } finally {
      setExportando(false);
    }
  }

  const colunas = useMemo(
    () => [
      {
        key: 'numero',
        header: 'Número',
        sortable: true,
        className: 'text-nowrap',
        render: (d) => (
          <Link to={`/flux/demandas/${d.id}`} className="nx-num-mono">
            {d.numero}
          </Link>
        ),
      },
      {
        key: 'titulo',
        header: 'Demanda',
        sortable: true,
        render: (d) => (
          <>
            <div className="nx-demanda-titulo">{d.titulo}</div>
            <div className="nx-demanda-sub">
              {[
                rotuloDoCatalogo(catalogos?.categorias, d.categoria),
                d.municipio?.nome && `${d.municipio.nome}/MT`,
              ]
                .filter((t) => t && t !== '—')
                .join(' · ')}
            </div>
          </>
        ),
      },
      { key: 'equipe', header: 'Equipe', render: (d) => d.equipe?.nome ?? '—' },
      { key: 'fiscal', header: 'Responsável', render: (d) => d.fiscal?.nome ?? '—' },
      {
        key: 'prioridade',
        header: 'Prioridade',
        sortable: true,
        render: (d) => (d.prioridade ? <PriorityBadge prioridade={d.prioridade} /> : '—'),
      },
      {
        key: 'status',
        header: 'Situação',
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
            <div>{formatarData(d.prazo)}</div>
            {d.prazo && <PrazoNota demanda={d} />}
          </>
        ),
      },
      {
        key: 'dataRecebimento',
        header: 'Abertura',
        className: 'text-nowrap',
        render: (d) => formatarData(d.dataRecebimento),
      },
      {
        key: 'acoes',
        header: <span className="visually-hidden">Ações</span>,
        className: 'text-end text-nowrap',
        render: (d) => (
          <>
            <Link
              to={`/flux/demandas/${d.id}`}
              className="nx-acao-icone"
              aria-label={`Ver ${d.numero}`}
              title="Ver detalhes"
            >
              <Icon name="eye" size={16} />
            </Link>
            {podeEditar && STATUS_EDITAVEIS.includes(d.status) && (
              <Link
                to={`/flux/demandas/${d.id}/editar`}
                className="nx-acao-icone"
                aria-label={`Editar ${d.numero}`}
                title="Editar"
              >
                <Icon name="pencil" size={16} />
              </Link>
            )}
          </>
        ),
      },
    ],
    [catalogos, podeEditar],
  );

  const temFiltro = CAMPOS_FILTRO.some((campo) => filtros[campo]);
  const kpis = [
    { label: 'Total', value: ind?.total, variant: 'green', icon: 'clipboard' },
    { label: 'Abertas', value: ind?.abertas, variant: 'blue', icon: 'inbox' },
    { label: 'Em triagem', value: ind?.emTriagem, variant: 'blue', icon: 'search' },
    { label: 'Em andamento', value: ind?.emAndamento, variant: 'blue', icon: 'loader' },
    { label: 'Finalizadas', value: ind?.finalizadas, variant: 'green', icon: 'check' },
    { label: 'Vencidas', value: ind?.vencidas, variant: 'red', icon: 'alarm' },
  ];

  return (
    <>
      <PageHeader
        module="Flux"
        title="Central de demandas"
        description="Cadastro, acompanhamento e movimentação das demandas administrativas e operacionais. Dados fictícios de demonstração."
        actions={
          <>
            {podeExportar && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={exportar}
                disabled={exportando}
              >
                <Icon name="download" size={15} className="me-1" />
                {exportando ? 'Exportando...' : 'Exportar CSV'}
              </button>
            )}
            {podeEditar && (
              <Link to="/flux/demandas/nova" className="btn btn-primary">
                <Icon name="plus" size={15} className="me-1" />
                Nova demanda
              </Link>
            )}
          </>
        }
      />

      {erroExport && (
        <div className="alert alert-danger" role="alert">
          Não foi possível exportar o CSV. {erroExport}
        </div>
      )}

      <section className="row g-3 mb-3" aria-label="Indicadores por situação">
        {kpis.map((k) => (
          <div className="col-6 col-md-4 col-xl-2" key={k.label}>
            <KpiCard {...k} loading={carregandoInd} />
          </div>
        ))}
      </section>

      {filtros.atrasada === 'true' && (
        <p className="mb-2" data-testid="chip-atrasadas">
          <span className="badge text-bg-warning d-inline-flex align-items-center gap-2 fs-6 fw-normal">
            Somente atrasadas
            <button
              type="button"
              className="btn-close btn-sm"
              aria-label="Remover filtro Somente atrasadas"
              onClick={() => atualizarUrl({ atrasada: '', page: '' })}
            />
          </span>
        </p>
      )}

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
