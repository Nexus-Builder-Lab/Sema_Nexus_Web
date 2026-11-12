import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listarBiomas,
  listarCategorias,
  listarMunicipios,
  listarStatus,
} from '../../api/catalogosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { baixarEGuardarCsv, obterRelatorioDemandas } from '../../api/relatoriosApi.js';
import DataTable from '../../components/DataTable.jsx';
import DemoSeal, { DEMO_SEAL_TEXT } from '../../components/DemoSeal.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { validarPeriodo } from './validarFiltros.js';
import '../../styles/print.css';

const CAMPOS = ['de', 'ate', 'municipioId', 'bioma', 'categoria', 'status'];
const TAMANHO_PAGINA = 20;

const rotuloDe = (itens, valor) => {
  if (valor == null || valor === '') return '';
  const item = (itens ?? []).find((i) => String(i.codigo ?? i.id) === String(valor));
  return item ? (item.rotulo ?? item.nome) : valor;
};

function Campo({ id, label, children }) {
  return (
    <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
      <label htmlFor={id} className="form-label small mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({ id, valor, itens, onChange }) {
  return (
    <select
      id={id}
      className="form-select"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Todos</option>
      {(itens ?? []).map((i) => (
        <option key={i.codigo ?? i.id} value={i.codigo ?? i.id}>
          {i.rotulo ?? i.nome}
        </option>
      ))}
    </select>
  );
}

function Filtros({ inicial, catalogos, onAplicar, onLimpar }) {
  const [rascunho, setRascunho] = useState(inicial);
  const [erro, setErro] = useState(null);
  const definir = (campo) => (valor) => setRascunho((r) => ({ ...r, [campo]: valor }));

  function enviar() {
    const mensagem = validarPeriodo(rascunho);
    setErro(mensagem);
    if (!mensagem) onAplicar(rascunho);
  }
  function limpar() {
    setRascunho(Object.fromEntries(CAMPOS.map((c) => [c, ''])));
    setErro(null);
    onLimpar();
  }
  const data = (campo, id) => (
    <input
      id={id}
      type="date"
      className="form-control"
      value={rascunho[campo]}
      aria-invalid={erro ? 'true' : undefined}
      onChange={(e) => definir(campo)(e.target.value)}
    />
  );

  return (
    <div className="nx-no-print">
      <FilterBar label="Filtros do relatório" onSubmit={enviar} onClear={limpar}>
        <Campo id="r-de" label="Recebidas de">
          {data('de', 'r-de')}
        </Campo>
        <Campo id="r-ate" label="Recebidas até">
          {data('ate', 'r-ate')}
        </Campo>
        <Campo id="r-municipio" label="Município">
          <Select
            id="r-municipio"
            valor={rascunho.municipioId}
            itens={catalogos.municipios}
            onChange={definir('municipioId')}
          />
        </Campo>
        <Campo id="r-bioma" label="Bioma">
          <Select
            id="r-bioma"
            valor={rascunho.bioma}
            itens={catalogos.biomas}
            onChange={definir('bioma')}
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
      </FilterBar>
      {erro && (
        <div className="alert alert-warning py-2" role="alert">
          {erro}
        </div>
      )}
    </div>
  );
}

/** Relatório de demandas (`/intelligence/relatorios`): filtros, tabela, CSV (API) e PDF (impressão). */
export default function RelatoriosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const [pagina, setPagina] = useState(0);
  const [baixando, setBaixando] = useState(false);

  const filtros = useMemo(
    () => Object.fromEntries(CAMPOS.map((c) => [c, searchParams.get(c) ?? ''])),
    [searchParams],
  );
  const chave = JSON.stringify(filtros);

  const { data: municipios } = useCarregar(listarMunicipios);
  const { data: biomas } = useCarregar(listarBiomas);
  const { data: categorias } = useCarregar(listarCategorias);
  const { data: status } = useCarregar(listarStatus);
  const catalogos = { municipios, biomas, categorias, status };

  // `chave` identifica o conteúdo dos filtros.
  const carregar = useCallback(
    () => obterRelatorioDemandas(filtros, { page: pagina, size: TAMANHO_PAGINA }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave, pagina],
  );
  const relatorio = useCarregar(carregar);

  function aplicar(novos) {
    const params = new URLSearchParams();
    CAMPOS.forEach((c) => novos[c] && params.set(c, novos[c]));
    setPagina(0);
    setSearchParams(params);
  }

  async function baixarCsv() {
    setBaixando(true);
    try {
      await baixarEGuardarCsv(filtros);
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
    filtros.de && `Recebidas de ${formatarData(filtros.de)}`,
    filtros.ate && `Recebidas até ${formatarData(filtros.ate)}`,
    filtros.municipioId && `Município: ${rotuloDe(municipios, filtros.municipioId)}`,
    filtros.bioma && `Bioma: ${rotuloDe(biomas, filtros.bioma)}`,
    filtros.categoria && `Categoria: ${rotuloDe(categorias, filtros.categoria)}`,
    filtros.status && `Status: ${rotuloDe(status, filtros.status)}`,
  ].filter(Boolean);

  const dados = relatorio.data;
  const data = (campo) => (r) => (r[campo] ? formatarData(r[campo]) : '—');
  const colunas = [
    { key: 'numero', header: 'Número' },
    { key: 'titulo', header: 'Título' },
    {
      key: 'categoria',
      header: 'Categoria',
      render: (r) => rotuloDe(categorias, r.categoria) || '—',
    },
    { key: 'municipio', header: 'Município' },
    { key: 'bioma', header: 'Bioma', render: (r) => rotuloDe(biomas, r.bioma) },
    { key: 'status', header: 'Status', render: (r) => rotuloDe(status, r.status) },
    { key: 'prioridade', header: 'Prioridade', render: (r) => r.prioridade ?? '—' },
    { key: 'dataRecebimento', header: 'Recebimento', render: data('dataRecebimento') },
    { key: 'prazo', header: 'Prazo', render: data('prazo') },
    { key: 'concluidaEm', header: 'Conclusão', render: data('concluidaEm') },
  ];

  return (
    <>
      <div className="nx-print-header" data-testid="cabecalho-impressao">
        <strong>{DEMO_SEAL_TEXT}</strong>
        <div>SEMA NEXUS — Relatório de demandas de fiscalização</div>
        <div>
          {resumoFiltros.length ? resumoFiltros.join(' · ') : 'Sem filtros (todas as demandas)'}
        </div>
      </div>

      <div className="nx-no-print">
        <PageHeader
          module="Intelligence"
          title="Relatórios"
          description="Demandas de fiscalização com filtros. Exporte em CSV (gerado pela API) ou salve como PDF pela impressão do navegador."
          actions={
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <DemoSeal />
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={baixarCsv}
                disabled={baixando}
              >
                {baixando ? 'Gerando CSV…' : 'Baixar CSV'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                Salvar como PDF
              </button>
            </div>
          }
        />
      </div>

      <Filtros
        key={searchParams.toString()}
        inicial={filtros}
        catalogos={catalogos}
        onAplicar={aplicar}
        onLimpar={() => {
          setPagina(0);
          setSearchParams(new URLSearchParams());
        }}
      />

      <DataTable
        caption="Relatório de demandas"
        columns={colunas}
        rows={dados?.content ?? []}
        rowKey="numero"
        loading={relatorio.loading}
        error={relatorio.error ? { message: mensagemDeErro(relatorio.error) } : null}
        onRetry={relatorio.recarregar}
        emptyTitle="Nenhuma demanda encontrada"
        emptyMessage="Ajuste os filtros para ver resultados."
        pagination={{
          page: dados?.page ?? 0,
          totalPages: dados?.totalPages,
          totalElements: dados?.totalElements,
          onPageChange: setPagina,
        }}
      />
      <p className="small text-body-secondary mt-2">
        Fonte: demandas fictícias do SEMA NEXUS. Municípios e biomas seguem o IBGE.
      </p>
    </>
  );
}
