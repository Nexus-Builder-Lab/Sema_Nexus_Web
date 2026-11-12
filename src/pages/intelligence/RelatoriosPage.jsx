import { FileSpreadsheet, Printer } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listarBiomas,
  listarCategorias,
  listarMunicipios,
  listarPrioridades,
  listarStatus,
} from '../../api/catalogosApi.js';
import { listarDocumentos } from '../../api/documentosApi.js';
import { listarPrazos, obterProdutividade, obterResumoPrazos } from '../../api/fluxApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { baixarEGuardarCsv, obterRelatorioDemandas, salvarBlob } from '../../api/relatoriosApi.js';
import { useAuth } from '../../auth/useAuth.js';
import DataTable from '../../components/DataTable.jsx';
import DemoSeal, { DEMO_SEAL_TEXT } from '../../components/DemoSeal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData, hojeISO } from '../../utils/datas.js';
import RelatorioFolha, { TabelaRelatorio } from './relatorios/RelatorioFolha.jsx';
import {
  TIPOS,
  csvProdutividade,
  gerarCsv,
  modeloDemandas,
  modeloDocumentos,
  modeloPrazos,
  modeloProdutividade,
  tituloDoTipo,
} from './relatorios/modelos.js';
import { validarPeriodo } from './validarFiltros.js';
import '../../styles/print.css';

import { aplicarBioma, municipiosDoBioma } from './filtroBioma.js';

const CAMPOS_DEMANDA = ['municipioId', 'bioma', 'categoria', 'status'];
const CAMPOS = ['tipo', 'de', 'ate', 'setorId', ...CAMPOS_DEMANDA];
const TAMANHO_PAGINA = 20;

const rotuloDe = (itens, valor) => {
  if (valor == null || valor === '') return '';
  const item = (itens ?? []).find((i) => String(i.codigo ?? i.id) === String(valor));
  return item ? (item.rotulo ?? item.nome) : valor;
};

const dataHora = (d) =>
  `${formatarData(hojeISO(d))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function Campo({ id, label, className = 'col-6 col-md-3 col-xl-2', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label small mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({ id, valor, itens, onChange, todos = 'Todos', disabled = false, title }) {
  return (
    <select
      id={id}
      className="form-select"
      value={valor}
      disabled={disabled}
      title={title}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{todos}</option>
      {(itens ?? []).map((i) => (
        <option key={i.codigo ?? i.id} value={i.codigo ?? i.id}>
          {i.rotulo ?? i.nome}
        </option>
      ))}
    </select>
  );
}

function Filtros({ inicial, catalogos, setores, onAplicar, onLimpar }) {
  const [rascunho, setRascunho] = useState(inicial);
  const [erro, setErro] = useState(null);
  const definir = (campo) => (valor) => setRascunho((r) => ({ ...r, [campo]: valor }));
  const demandas = rascunho.tipo === 'demandas';
  const produtividade = rascunho.tipo === 'produtividade';
  const semPeriodo = rascunho.tipo === 'prazos';

  function enviar() {
    const mensagem = validarPeriodo(rascunho);
    setErro(mensagem);
    if (!mensagem) onAplicar(rascunho);
  }
  function limpar() {
    setRascunho({ ...Object.fromEntries(CAMPOS.map((c) => [c, ''])), tipo: 'demandas' });
    setErro(null);
    onLimpar();
  }
  const data = (campo, id) => (
    <input
      id={id}
      type="date"
      className="form-control"
      value={rascunho[campo]}
      disabled={semPeriodo}
      aria-invalid={erro ? 'true' : undefined}
      onChange={(e) => definir(campo)(e.target.value)}
    />
  );

  return (
    <div className="nx-no-print">
      <FilterBar label="Filtros do relatório" onSubmit={enviar} onClear={limpar}>
        <Campo id="r-tipo" label="Tipo de informação" className="col-12 col-md-6 col-xl-4">
          <select
            id="r-tipo"
            className="form-select"
            value={rascunho.tipo}
            onChange={(e) => definir('tipo')(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="r-de" label="De">
          {data('de', 'r-de')}
        </Campo>
        <Campo id="r-ate" label="Até">
          {data('ate', 'r-ate')}
        </Campo>
        <Campo id="r-setor" label="Setor">
          <Select
            id="r-setor"
            valor={rascunho.setorId}
            itens={setores}
            todos="Todos os setores"
            disabled={!produtividade}
            title={produtividade ? undefined : 'O filtro de setor se aplica à produtividade.'}
            onChange={definir('setorId')}
          />
        </Campo>
        {demandas && (
          <>
            <Campo id="r-municipio" label="Município">
              <Select
                id="r-municipio"
                valor={rascunho.municipioId}
                itens={municipiosDoBioma(catalogos.municipios, rascunho.bioma)}
                onChange={definir('municipioId')}
              />
            </Campo>
            <Campo id="r-bioma" label="Bioma">
              <Select
                id="r-bioma"
                valor={rascunho.bioma}
                itens={catalogos.biomas}
                onChange={(b) =>
                  setRascunho((atual) => aplicarBioma(atual, b, catalogos.municipios))
                }
              />
            </Campo>
            <Campo id="r-categoria" label="Categoria">
              <Select
                id="r-categoria"
                valor={rascunho.categoria}
                itens={catalogos.categorias}
                onChange={definir('categoria')}
              />
            </Campo>
            <Campo id="r-status" label="Status">
              <Select
                id="r-status"
                valor={rascunho.status}
                itens={catalogos.status}
                onChange={definir('status')}
              />
            </Campo>
          </>
        )}
      </FilterBar>
      {erro && (
        <div className="alert alert-warning py-2" role="alert">
          {erro}
        </div>
      )}
    </div>
  );
}

/** Carrega os dados de apoio do relatório (KPIs e tabelas) conforme o tipo; as demandas paginadas vêm à parte. */
function carregarApoio(tipo, filtros) {
  const periodo = { de: filtros.de || undefined, ate: filtros.ate || undefined };
  if (tipo === 'demandas') return obterRelatorioDemandas(filtros, { page: 0, size: 100 });
  if (tipo === 'produtividade') {
    return obterProdutividade({ ...periodo, setorId: filtros.setorId || undefined });
  }
  if (tipo === 'documentos') return listarDocumentos({ ...periodo, size: 100 });
  return Promise.all([
    obterResumoPrazos(),
    ...['VENCIDA', 'PROXIMA', 'NO_PRAZO'].map((estado) => listarPrazos({ estado, size: 100 })),
  ]).then(([resumo, ...paginas]) => ({
    resumo,
    itens: paginas
      .flatMap((p) => p.content ?? [])
      .sort((a, b) => String(a.prazo).localeCompare(String(b.prazo))),
  }));
}

/** Relatórios gerenciais (`/intelligence/relatorios`): 4 tipos, filtros, CSV e PDF (impressão). */
export default function RelatoriosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { usuario } = useAuth();
  const [pagina, setPagina] = useState(0);
  const [baixando, setBaixando] = useState(false);
  const [emitidoEm] = useState(() => dataHora(new Date()));

  const filtros = useMemo(() => {
    const f = Object.fromEntries(CAMPOS.map((c) => [c, searchParams.get(c) ?? '']));
    return { ...f, tipo: TIPOS.some((t) => t.value === f.tipo) ? f.tipo : 'demandas' };
  }, [searchParams]);
  const chave = JSON.stringify(filtros);
  const tipo = filtros.tipo;
  // Filtros enviados à API de demandas (sem `tipo`/`setorId`).
  const filtrosDemanda = useMemo(
    () => ({
      de: filtros.de,
      ate: filtros.ate,
      ...Object.fromEntries(CAMPOS_DEMANDA.map((c) => [c, filtros[c]])),
    }),
    [filtros],
  );

  const { data: municipios } = useCarregar(listarMunicipios);
  const { data: biomas } = useCarregar(listarBiomas);
  const { data: categorias } = useCarregar(listarCategorias);
  const { data: status } = useCarregar(listarStatus);
  const { data: prioridades } = useCarregar(listarPrioridades);
  const { data: panorama } = useCarregar(obterProdutividade);
  const setores = useMemo(
    () => (panorama?.porSetorSituacao ?? []).map((s) => ({ id: s.setorId, nome: s.setor })),
    [panorama],
  );
  const catalogos = { municipios, biomas, categorias, status };

  // `chave` identifica o conteúdo dos filtros.
  /* eslint-disable react-hooks/exhaustive-deps */
  const carregarTabela = useCallback(
    () =>
      tipo === 'demandas'
        ? obterRelatorioDemandas(filtrosDemanda, { page: pagina, size: TAMANHO_PAGINA })
        : Promise.resolve(null),
    [chave, pagina],
  );
  const carregarResumo = useCallback(
    () => carregarApoio(tipo, tipo === 'demandas' ? filtrosDemanda : filtros),
    [chave],
  );
  /* eslint-enable react-hooks/exhaustive-deps */
  const tabela = useCarregar(carregarTabela);
  const apoio = useCarregar(carregarResumo);
  const dados = tabela.data;

  const hoje = hojeISO();
  const modelo = useMemo(() => {
    if (!apoio.data || apoio.loading) return null;
    const rotulos = {
      categoria: (v) => rotuloDe(categorias, v),
      status: (v) => rotuloDe(status, v),
      prioridade: (v) => rotuloDe(prioridades, v),
    };
    if (tipo === 'demandas') return modeloDemandas(apoio.data, rotulos.categoria, hoje);
    if (tipo === 'prazos') {
      return modeloPrazos(apoio.data.resumo, apoio.data.itens, rotulos.status, rotulos.prioridade);
    }
    if (tipo === 'produtividade') return modeloProdutividade(apoio.data);
    return modeloDocumentos(apoio.data);
  }, [apoio.data, apoio.loading, tipo, categorias, status, prioridades, hoje]);

  function aplicar(novos) {
    const params = new URLSearchParams();
    const incluir = (c) => {
      if (c === 'tipo') return true;
      if (c === 'de' || c === 'ate') return novos.tipo !== 'prazos';
      if (c === 'setorId') return novos.tipo === 'produtividade';
      return novos.tipo === 'demandas';
    };
    CAMPOS.filter(incluir).forEach((c) => novos[c] && params.set(c, novos[c]));
    setPagina(0);
    setSearchParams(params);
  }

  async function exportarCsv() {
    setBaixando(true);
    try {
      if (tipo === 'demandas') {
        await baixarEGuardarCsv(filtrosDemanda);
      } else {
        const { headers, rows } =
          tipo === 'produtividade' ? csvProdutividade(modelo) : modelo.tabela;
        const blob = new Blob([gerarCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
        salvarBlob(blob, `relatorio-${tipo}-ficticio.csv`);
      }
      showToast({ variant: 'success', message: 'CSV gerado com os filtros aplicados.' });
    } catch (erro) {
      showToast({
        variant: 'danger',
        message: mensagemDeErro(erro, 'Não foi possível gerar o CSV.'),
      });
    } finally {
      setBaixando(false);
    }
  }

  const resumoFiltros = [
    filtros.de && `De ${formatarData(filtros.de)}`,
    filtros.ate && `Até ${formatarData(filtros.ate)}`,
    tipo === 'demandas' &&
      filtros.municipioId &&
      `Município: ${rotuloDe(municipios, filtros.municipioId)}`,
    tipo === 'demandas' && filtros.bioma && `Bioma: ${rotuloDe(biomas, filtros.bioma)}`,
    tipo === 'demandas' &&
      filtros.categoria &&
      `Categoria: ${rotuloDe(categorias, filtros.categoria)}`,
    tipo === 'demandas' && filtros.status && `Status: ${rotuloDe(status, filtros.status)}`,
  ].filter(Boolean);

  let periodo = 'Todo o período';
  if (tipo === 'prazos') periodo = 'posição atual';
  else if (filtros.de && filtros.ate) {
    periodo = `${formatarData(filtros.de)} a ${formatarData(filtros.ate)}`;
  } else if (filtros.de) periodo = `a partir de ${formatarData(filtros.de)}`;
  else if (filtros.ate) periodo = `até ${formatarData(filtros.ate)}`;
  const setorRotulo =
    tipo === 'produtividade' && filtros.setorId ? rotuloDe(setores, filtros.setorId) : 'Todos';

  const data = (campo) => (r) => (r[campo] ? formatarData(r[campo]) : '—');
  const colunas = [
    { key: 'numero', header: 'Número' },
    { key: 'titulo', header: 'Título' },
    {
      key: 'categoria',
      header: 'Tipo',
      render: (r) => rotuloDe(categorias, r.categoria) || '—',
    },
    { key: 'municipio', header: 'Município' },
    { key: 'bioma', header: 'Bioma', render: (r) => rotuloDe(biomas, r.bioma) },
    { key: 'status', header: 'Situação', render: (r) => rotuloDe(status, r.status) },
    {
      key: 'prioridade',
      header: 'Prioridade',
      render: (r) => rotuloDe(prioridades, r.prioridade) || '—',
    },
    { key: 'dataRecebimento', header: 'Abertura', render: data('dataRecebimento') },
    { key: 'prazo', header: 'Prazo', render: data('prazo') },
    { key: 'concluidaEm', header: 'Conclusão', render: data('concluidaEm') },
  ];

  const carregando = apoio.loading || (tipo === 'demandas' && tabela.loading && !dados);
  const erro = apoio.error ?? tabela.error;
  const recarregar = () => {
    apoio.recarregar();
    tabela.recarregar();
  };
  const aviso =
    modelo?.truncado && 'Indicadores calculados sobre os 100 registros mais recentes do filtro.';

  let corpo;
  if (erro) {
    corpo = <ErrorState message={mensagemDeErro(erro)} onRetry={recarregar} />;
  } else if (carregando) {
    corpo = <Loading message="Carregando relatório..." />;
  } else if (modelo) {
    corpo = (
      <RelatorioFolha
        titulo={tituloDoTipo(tipo) + (tipo === 'prazos' ? ` em ${formatarData(hoje)}` : '')}
        periodo={periodo}
        setor={setorRotulo}
        emitidoEm={emitidoEm}
        emitidoPor={usuario?.nome}
        kpis={modelo.kpis}
        secoes={modelo.secoes}
        aviso={aviso}
      >
        {tipo === 'demandas' ? (
          <section>
            <h3 className="h6">Relação de demandas</h3>
            <DataTable
              caption="Relatório de demandas"
              columns={colunas}
              rows={dados?.content ?? []}
              rowKey="numero"
              loading={tabela.loading}
              onRetry={tabela.recarregar}
              emptyTitle="Nenhuma demanda encontrada"
              emptyMessage="Ajuste os filtros para ver resultados."
              pagination={{
                page: dados?.page ?? 0,
                totalPages: dados?.totalPages,
                totalElements: dados?.totalElements,
                onPageChange: setPagina,
              }}
            />
          </section>
        ) : modelo.tabela.rows.length === 0 ? (
          <EmptyState
            title="Nenhum registro no período"
            message="Ajuste os filtros para ver resultados."
          />
        ) : (
          <section>
            <h3 className="h6">{modelo.tituloTabela ?? 'Relação'}</h3>
            <TabelaRelatorio
              caption={tituloDoTipo(tipo)}
              headers={modelo.tabela.headers}
              rows={modelo.tabela.rows}
            />
          </section>
        )}
      </RelatorioFolha>
    );
  }

  return (
    <>
      <div className="nx-print-header" data-testid="cabecalho-impressao">
        <strong>{DEMO_SEAL_TEXT}</strong>
        {tipo === 'demandas' && dados && (
          <div data-testid="paginacao-impressao">
            Exibindo página {dados.page + 1} de {Math.max(dados.totalPages, 1)} (
            {dados.totalElements} registros)
          </div>
        )}
        <div>{resumoFiltros.length ? resumoFiltros.join(' · ') : 'Sem filtros'}</div>
      </div>

      <div className="nx-no-print">
        <PageHeader
          module="Intelligence"
          title="Relatórios gerenciais"
          description='Gere relatórios a partir dos dados cadastrados. Exporte em CSV (planilha) ou PDF (pela opção "Salvar como PDF" da janela de impressão).'
          actions={
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <DemoSeal />
              <button
                type="button"
                className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                onClick={exportarCsv}
                disabled={baixando || !modelo}
              >
                <FileSpreadsheet size={16} aria-hidden="true" />
                {baixando ? 'Gerando CSV…' : 'Exportar CSV'}
              </button>
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                onClick={() => window.print()}
              >
                <Printer size={16} aria-hidden="true" />
                Exportar PDF
              </button>
            </div>
          }
        />
      </div>

      <Filtros
        key={searchParams.toString()}
        inicial={filtros}
        catalogos={catalogos}
        setores={setores}
        onAplicar={aplicar}
        onLimpar={() => {
          setPagina(0);
          setSearchParams(new URLSearchParams());
        }}
      />

      {corpo}
    </>
  );
}
