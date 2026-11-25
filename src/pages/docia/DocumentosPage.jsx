import { useCallback, useId, useMemo, useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarMunicipios } from '../../api/catalogosApi.js';
import { listarDocumentos, pesquisarDocumentos } from '../../api/documentosApi.js';
import { useAuth } from '../../auth/useAuth.js';
import { PERFIS_ESCRITA_DOCUMENTO } from '../../auth/perfis.js';
import DataTable from '../../components/DataTable.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import {
  EXPLICACAO_SIMILARIDADE,
  SeloRecuperacao,
  SeloSimilaridade,
} from '../../components/RecuperacaoDocia.jsx';
import { EXPLICACAO_ADERENCIA } from '../../components/RespostaDocia.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { formatarTamanho } from './validarDocumento.js';

const carregarTodos = () => listarDocumentos({ page: 0, size: 200 });
const TAMANHO_PAGINA = 20;
const ORDEM_PADRAO = 'criadoEm,desc';
const CAMPOS_FILTRO = ['q', 'categoria', 'tipo', 'municipioId', 'de', 'ate'];
// Limites de `GET /api/documentos/busca` (consulta de 2 a 200 caracteres; até 20 resultados).
const MIN_CONSULTA_BUSCA = 2;
const MAX_CONSULTA = 200;
const LIMITE_BUSCA = 20;

export const AVISO_BUSCA =
  'A pesquisa procura o trecho digitado no título, na descrição, nas palavras-chave e no conteúdo extraído, sem diferenciar maiúsculas e acentos. Quando a busca híbrida está ativa, os documentos também podem ser encontrados por proximidade de sentido.';

/**
 * Nos resultados ranqueados, os filtros de categoria, tipo, município e datas são aplicados sobre os até 20
 * documentos mais relevantes (a API de pesquisa não recebe esses filtros).
 */
function filtrarResultadosBusca(resultados, filtros) {
  const contem = (valor, termo) =>
    (valor ?? '').toLocaleLowerCase('pt-BR').includes(termo.toLocaleLowerCase('pt-BR'));
  return resultados.filter(({ documento: d }) => {
    if (filtros.categoria && !contem(d.categoria, filtros.categoria)) return false;
    if (filtros.tipo && !contem(d.tipo, filtros.tipo)) return false;
    if (filtros.municipioId && String(d.municipio?.id ?? '') !== filtros.municipioId) return false;
    if (filtros.de && (d.dataDocumento ?? '') < filtros.de) return false;
    if (filtros.ate && (d.dataDocumento ?? '') > filtros.ate) return false;
    return true;
  });
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
          maxLength={MAX_CONSULTA}
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

  const { data: todos } = useCarregar(carregarTodos);

  // Pesquisa com termo (>= 2 caracteres) usa a pesquisa ranqueada; sem termo, a listagem paginada de sempre.
  const termoBusca = (filtros.q ?? '').trim();
  const emBusca = termoBusca.length >= MIN_CONSULTA_BUSCA;
  const idExplicacaoBusca = useId();

  const carregar = useCallback(async () => {
    if (emBusca) {
      const resposta = await pesquisarDocumentos(termoBusca, { limite: LIMITE_BUSCA });
      return {
        busca: true,
        recuperacao: resposta.recuperacao,
        resultados: resposta.resultados ?? [],
      };
    }
    const page = await listarDocumentos({
      ...filtros,
      page: pagina,
      size: TAMANHO_PAGINA,
      sort: ordem,
    });
    return { busca: false, page };
    // `filtros` deriva de `chaveFiltros`; a chave evita refazer a busca a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveFiltros, pagina, ordem]);
  const { data: resultado, loading, error, recarregar } = useCarregar(carregar);
  // Resultados de uma pesquisa anterior (ou de uma listagem) não aparecem enquanto a nova carga não chega.
  const resultadosBusca =
    emBusca && resultado?.busca && !loading
      ? filtrarResultadosBusca(resultado.resultados, filtros)
      : null;
  const paginaLista = !emBusca && resultado && !resultado.busca ? resultado.page : null;
  const linhas = emBusca
    ? (resultadosBusca ?? []).map((r) => ({ ...r.documento, busca: r }))
    : (paginaLista?.content ?? []);
  const temSimilaridade = resultadosBusca?.some((r) => r.similaridadeSemantica != null);

  function atualizarUrl(mudancas) {
    const proximo = new URLSearchParams(searchParams);
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === '' || valor == null) proximo.delete(chave);
      else proximo.set(chave, String(valor));
    }
    setSearchParams(proximo);
  }

  const colunas = useMemo(() => {
    // Na pesquisa ranqueada a ordem é a relevância da API: sem ordenação por coluna.
    const ordenavel = !emBusca;
    const colunaRelevancia = {
      key: 'relevancia',
      header: 'Trecho e aderência',
      className: 'small',
      render: (d) => (
        <>
          <blockquote className="border-start ps-2 mb-1 text-body-secondary">
            {d.busca.trecho}
          </blockquote>
          {d.busca.aderenciaTextual && (
            <span
              className="badge text-bg-light border fw-normal"
              data-testid="aderencia-textual"
              title={EXPLICACAO_ADERENCIA}
            >
              Aderência textual: {d.busca.aderenciaTextual}
            </span>
          )}
          <SeloSimilaridade
            valor={d.busca.similaridadeSemantica}
            idExplicacao={idExplicacaoBusca}
          />
        </>
      ),
    };
    return [
      {
        key: 'titulo',
        header: 'Título',
        sortable: ordenavel,
        render: (d) => (
          <div className="d-flex align-items-start gap-2">
            <FileText size={18} className="text-success flex-shrink-0 mt-1" aria-hidden="true" />
            <div>
              <Link to={`/docia/documentos/${d.id}`} className="fw-semibold">
                {d.titulo}
              </Link>
              <div className="small text-body-secondary">
                {d.tipo ? `${d.tipo} · ` : ''}
                {d.nomeArquivo}
              </div>
            </div>
          </div>
        ),
      },
      ...(emBusca ? [colunaRelevancia] : []),
      {
        key: 'categoria',
        header: 'Categoria',
        sortable: ordenavel,
        render: (d) => <span className="badge text-bg-light border">{d.categoria}</span>,
      },
      { key: 'municipio', header: 'Município', render: (d) => d.municipio?.nome ?? '—' },
      {
        key: 'dataDocumento',
        header: 'Data / responsável',
        sortable: ordenavel,
        className: 'text-nowrap',
        render: (d) => (
          <>
            <div>{formatarData(d.dataDocumento)}</div>
            <div className="small text-body-secondary">{d.responsavel?.nome ?? ''}</div>
          </>
        ),
      },
      {
        key: 'tamanho',
        header: 'Tamanho',
        className: 'text-nowrap small',
        render: (d) => formatarTamanho(d.tamanho),
      },
      {
        key: 'acoes',
        header: 'Ações',
        render: (d) => (
          <Link
            to={`/docia/documentos/${d.id}`}
            className="btn btn-sm btn-outline-secondary"
            aria-label={`Abrir ${d.titulo}`}
          >
            <Eye size={16} aria-hidden="true" />
          </Link>
        ),
      },
    ];
  }, [emBusca, idExplicacaoBusca]);

  const categorias = useMemo(() => {
    const contagem = new Map();
    for (const d of todos?.content ?? []) {
      contagem.set(d.categoria, (contagem.get(d.categoria) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [todos]);
  const totalGeral = todos?.totalElements ?? 0;

  const temFiltro = CAMPOS_FILTRO.some((c) => filtros[c] !== '');

  return (
    <>
      <PageHeader
        module="DocIA"
        title="Gestão documental"
        description="Cadastro, consulta e organização dos documentos institucionais (fictícios), com vínculo às demandas. Pesquisa textual."
        actions={
          podeEnviar && (
            <Link to="/docia/documentos/novo" className="btn btn-primary">
              Cadastrar documento
            </Link>
          )
        }
      />
      <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Categorias">
        <button
          type="button"
          className={`btn btn-sm nx-chip${filtros.categoria === '' ? ' active' : ''}`}
          onClick={() => atualizarUrl({ categoria: '', page: '' })}
        >
          Todas ({totalGeral})
        </button>
        {categorias.map(([nome, qtd]) => (
          <button
            key={nome}
            type="button"
            className={`btn btn-sm nx-chip${filtros.categoria === nome ? ' active' : ''}`}
            onClick={() => atualizarUrl({ categoria: nome, page: '' })}
          >
            {nome} ({qtd})
          </button>
        ))}
      </div>
      <Filtros
        key={chaveFiltros}
        inicial={filtros}
        municipios={municipios}
        onAplicar={(valores) => atualizarUrl({ ...valores, page: '' })}
        onLimpar={() => setSearchParams(new URLSearchParams())}
      />
      {resultadosBusca && (
        <div className="mb-2" data-testid="pesquisa-documentos">
          <p className="small text-body-secondary mb-1">
            Até {LIMITE_BUSCA} documentos mais relevantes para “{termoBusca}”.
          </p>
          <SeloRecuperacao
            recuperacao={resultado.recuperacao}
            explicacaoId={idExplicacaoBusca}
            complemento={temSimilaridade ? EXPLICACAO_SIMILARIDADE : null}
          />
        </div>
      )}
      <DataTable
        caption="Documentos da biblioteca"
        columns={colunas}
        rows={linhas}
        loading={loading}
        error={error}
        onRetry={recarregar}
        emptyTitle={temFiltro ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
        emptyMessage={
          temFiltro
            ? 'Ajuste a pesquisa ou limpe os filtros.'
            : 'Envie o primeiro documento pelo botão "Cadastrar documento".'
        }
        sort={
          emBusca
            ? undefined
            : { key: campoOrdem, direction: direcaoOrdem === 'asc' ? 'asc' : 'desc' }
        }
        onSortChange={
          emBusca
            ? undefined
            : ({ key, direction }) => atualizarUrl({ sort: `${key},${direction}`, page: '' })
        }
        pagination={
          !emBusca &&
          paginaLista && {
            page: paginaLista.page,
            totalPages: paginaLista.totalPages,
            totalElements: paginaLista.totalElements,
            onPageChange: (p) => atualizarUrl({ page: p || '' }),
          }
        }
      />
    </>
  );
}
