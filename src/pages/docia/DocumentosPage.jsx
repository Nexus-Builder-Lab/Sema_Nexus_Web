import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarMunicipios } from '../../api/catalogosApi.js';
import { listarDocumentos } from '../../api/documentosApi.js';
import { useAuth } from '../../auth/useAuth.js';
import { PERFIS_ESCRITA_DOCUMENTO } from '../../auth/perfis.js';
import DataTable from '../../components/DataTable.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { formatarTamanho } from './validarDocumento.js';

const TAMANHO_PAGINA = 20;
const ORDEM_PADRAO = 'criadoEm,desc';
const CAMPOS_FILTRO = ['q', 'categoria', 'tipo', 'municipioId', 'de', 'ate'];

export const AVISO_BUSCA =
  'A pesquisa é textual: procura o trecho digitado no título, na descrição, nas palavras-chave e no conteúdo extraído, sem diferenciar maiúsculas e acentos. Não é busca semântica.';

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

function Filtros({ inicial, municipios, onAplicar, onLimpar }) {
  const [rascunho, setRascunho] = useState(inicial);
  const definir = (campo) => (e) => setRascunho((atual) => ({ ...atual, [campo]: e.target.value }));

  return (
    <FilterBar
      label="Filtros de documentos"
      onSubmit={() => onAplicar(rascunho)}
      onClear={() => {
        setRascunho(Object.fromEntries(CAMPOS_FILTRO.map((campo) => [campo, ''])));
        onLimpar();
      }}
    >
      <Campo id="filtro-q" label="Pesquisar nos documentos" className="col-12">
        <input
          id="filtro-q"
          type="search"
          className="form-control"
          aria-describedby="filtro-q-ajuda"
          placeholder="Título, descrição, palavras-chave ou conteúdo"
          value={rascunho.q}
          onChange={definir('q')}
        />
        <div id="filtro-q-ajuda" className="form-text">
          {AVISO_BUSCA}
        </div>
      </Campo>
      <Campo id="filtro-categoria" label="Categoria">
        <input
          id="filtro-categoria"
          type="text"
          className="form-control"
          value={rascunho.categoria}
          onChange={definir('categoria')}
        />
      </Campo>
      <Campo id="filtro-tipo" label="Tipo">
        <input
          id="filtro-tipo"
          type="text"
          className="form-control"
          value={rascunho.tipo}
          onChange={definir('tipo')}
        />
      </Campo>
      <Campo id="filtro-municipio" label="Município">
        <select
          id="filtro-municipio"
          className="form-select"
          value={rascunho.municipioId}
          onChange={definir('municipioId')}
        >
          <option value="">Todos</option>
          {(municipios ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="filtro-de" label="Documento de">
        <input
          id="filtro-de"
          type="date"
          className="form-control"
          value={rascunho.de}
          onChange={definir('de')}
        />
      </Campo>
      <Campo id="filtro-ate" label="Documento até">
        <input
          id="filtro-ate"
          type="date"
          className="form-control"
          value={rascunho.ate}
          onChange={definir('ate')}
        />
      </Campo>
    </FilterBar>
  );
}

/** Biblioteca documental (`/docia/documentos`): pesquisa textual, filtros e paginação. */
export default function DocumentosPage() {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const podeEnviar = PERFIS_ESCRITA_DOCUMENTO.includes(usuario?.perfil);
  const { data: municipios } = useCarregar(listarMunicipios);

  const filtros = Object.fromEntries(CAMPOS_FILTRO.map((c) => [c, searchParams.get(c) ?? '']));
  const pagina = Math.max(0, Number(searchParams.get('page')) || 0);
  const ordem = searchParams.get('sort') || ORDEM_PADRAO;
  const [campoOrdem, direcaoOrdem] = ordem.split(',');
  const chaveFiltros = CAMPOS_FILTRO.map((c) => searchParams.get(c) ?? '').join('|');

  const carregar = useCallback(
    () => listarDocumentos({ ...filtros, page: pagina, size: TAMANHO_PAGINA, sort: ordem }),
    // `filtros` deriva de `chaveFiltros`; a chave evita refazer a busca a cada render.
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
        key: 'titulo',
        header: 'Título',
        sortable: true,
        render: (d) => <Link to={`/docia/documentos/${d.id}`}>{d.titulo}</Link>,
      },
      { key: 'categoria', header: 'Categoria', sortable: true },
      { key: 'tipo', header: 'Tipo' },
      { key: 'municipio', header: 'Município', render: (d) => d.municipio?.nome ?? '—' },
      {
        key: 'dataDocumento',
        header: 'Data',
        sortable: true,
        className: 'text-nowrap',
        render: (d) => formatarData(d.dataDocumento),
      },
      {
        key: 'nomeArquivo',
        header: 'Arquivo',
        render: (d) => (
          <span className="small">
            {d.nomeArquivo}{' '}
            <span className="text-body-secondary">({formatarTamanho(d.tamanho)})</span>
          </span>
        ),
      },
    ],
    [],
  );

  const temFiltro = CAMPOS_FILTRO.some((c) => filtros[c] !== '');

  return (
    <>
      <PageHeader
        module="DocIA"
        title="Documentos"
        description="Biblioteca documental com documentos fictícios. Pesquisa textual."
        actions={
          podeEnviar && (
            <Link to="/docia/documentos/novo" className="btn btn-primary">
              Novo documento
            </Link>
          )
        }
      />
      <Filtros
        key={chaveFiltros}
        inicial={filtros}
        municipios={municipios}
        onAplicar={(valores) => atualizarUrl({ ...valores, page: '' })}
        onLimpar={() => setSearchParams(new URLSearchParams())}
      />
      <DataTable
        caption="Documentos da biblioteca"
        columns={colunas}
        rows={data?.content ?? []}
        loading={loading}
        error={error}
        onRetry={recarregar}
        emptyTitle={temFiltro ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
        emptyMessage={
          temFiltro
            ? 'Ajuste a pesquisa ou limpe os filtros.'
            : 'Envie o primeiro documento pelo botão "Novo documento".'
        }
        sort={{ key: campoOrdem, direction: direcaoOrdem === 'asc' ? 'asc' : 'desc' }}
        onSortChange={({ key, direction }) =>
          atualizarUrl({ sort: `${key},${direction}`, page: '' })
        }
        pagination={
          data && {
            page: data.page,
            totalPages: data.totalPages,
            totalElements: data.totalElements,
            onPageChange: (p) => atualizarUrl({ page: p || '' }),
          }
        }
      />
    </>
  );
}
