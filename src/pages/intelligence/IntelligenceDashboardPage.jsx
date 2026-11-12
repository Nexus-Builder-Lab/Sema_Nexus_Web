import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/httpClient.js';
import { listarBiomas, listarCategorias, listarMunicipios } from '../../api/catalogosApi.js';
import {
  obterPorBioma,
  obterPorCategoria,
  obterPorMunicipio,
  obterPorSituacao,
  obterResumo,
  obterSerieMensal,
} from '../../api/intelligenceApi.js';
import ChartCard from '../../components/ChartCard.jsx';
import DemoSeal from '../../components/DemoSeal.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import IndicatorChart from '../../components/IndicatorChart.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { validarPeriodo } from './validarFiltros.js';
import { CORES_BIOMA, CORES_STATUS, corDaSerie, CORES_SERIE } from '../../utils/paleta.js';

import { aplicarBioma, municipiosDoBioma } from './filtroBioma.js';

const CAMPOS_FILTRO = ['municipioId', 'bioma', 'categoria', 'de', 'ate'];
const TOP_MUNICIPIOS = 10;

const formatarNumero = (valor) => (valor == null ? null : Number(valor).toLocaleString('pt-BR'));

/** "2026-10" → "10/2026". */
function formatarMes(mes) {
  const [ano, numero] = String(mes).split('-');
  return ano && numero ? `${numero}/${ano}` : String(mes);
}

/** Carrega um indicador da API com os filtros aplicados (recarrega quando eles mudam). */
function useIndicador(funcao, filtros) {
  const chave = JSON.stringify(filtros);
  // `chave` identifica o conteúdo dos filtros: o callback só muda quando eles mudam.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const carregar = useCallback(() => funcao(filtros), [funcao, chave]);
  return useCarregar(carregar);
}

function Campo({ id, label, className = 'col-12 col-sm-6 col-lg-3 col-xl', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label small mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({ id, valor, itens = [], onChange, vazio = 'Todos' }) {
  return (
    <select
      id={id}
      className="form-select"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{vazio}</option>
      {(itens ?? []).map((item) => (
        <option key={item.codigo ?? item.id} value={item.codigo ?? item.id}>
          {item.rotulo ?? item.nome}
        </option>
      ))}
    </select>
  );
}

/** Filtros do dashboard. O rascunho só vira filtro aplicado (URL) ao enviar. */
function FiltrosAmbientais({ inicial, municipios, biomas, categorias, onAplicar, onLimpar }) {
  const [rascunho, setRascunho] = useState(inicial);
  const [erro, setErro] = useState(null);
  const definir = (campo) => (valor) => setRascunho((atual) => ({ ...atual, [campo]: valor }));

  function enviar() {
    const mensagem = validarPeriodo(rascunho);
    setErro(mensagem);
    if (!mensagem) onAplicar(rascunho);
  }

  function limpar() {
    setRascunho(Object.fromEntries(CAMPOS_FILTRO.map((c) => [c, ''])));
    setErro(null);
    onLimpar();
  }

  return (
    <>
      <FilterBar label="Filtros do dashboard ambiental" onSubmit={enviar} onClear={limpar}>
        <Campo id="f-municipio" label="Município">
          <Select
            id="f-municipio"
            valor={rascunho.municipioId}
            itens={municipiosDoBioma(municipios, rascunho.bioma)}
            onChange={definir('municipioId')}
          />
        </Campo>
        <Campo id="f-bioma" label="Bioma">
          <Select
            id="f-bioma"
            valor={rascunho.bioma}
            itens={biomas}
            onChange={(b) => setRascunho((atual) => aplicarBioma(atual, b, municipios))}
          />
        </Campo>
        <Campo id="f-categoria" label="Categoria">
          <Select
            id="f-categoria"
            valor={rascunho.categoria}
            itens={categorias}
            onChange={definir('categoria')}
          />
        </Campo>
        <Campo id="f-de" label="Recebidas de">
          <input
            id="f-de"
            type="date"
            className="form-control"
            value={rascunho.de}
            aria-invalid={erro ? 'true' : undefined}
            onChange={(e) => definir('de')(e.target.value)}
          />
        </Campo>
        <Campo id="f-ate" label="Recebidas até">
          <input
            id="f-ate"
            type="date"
            className="form-control"
            value={rascunho.ate}
            aria-invalid={erro ? 'true' : undefined}
            onChange={(e) => definir('ate')(e.target.value)}
          />
        </Campo>
      </FilterBar>
      {erro && (
        <div className="alert alert-warning py-2" role="alert">
          {erro}
        </div>
      )}
    </>
  );
}

function CardsResumo({ filtros }) {
  const { data, loading, error, recarregar } = useIndicador(obterResumo, filtros);
  if (error) return <ErrorState message={mensagemDeErro(error)} onRetry={recarregar} />;
  return (
    <div className="row g-3">
      <div className="col-6 col-lg-3">
        <KpiCard
          label="Total de demandas"
          value={formatarNumero(data?.totalDemandas)}
          loading={loading}
          tooltip="Demandas de fiscalização recebidas que atendem aos filtros, em qualquer situação."
        />
      </div>
      <div className="col-6 col-lg-3">
        <KpiCard
          label="Em fiscalização"
          value={formatarNumero(data?.emAndamento)}
          variant="blue"
          loading={loading}
          tooltip="Demandas com a fiscalização em curso (situação Em andamento) que atendem aos filtros."
        />
      </div>
      <div className="col-6 col-lg-3">
        <KpiCard
          label="Concluídas"
          value={formatarNumero(data?.finalizadas)}
          loading={loading}
          tooltip="Demandas finalizadas que atendem aos filtros."
        />
      </div>
      <div className="col-6 col-lg-3">
        <KpiCard
          label="Pendentes"
          value={formatarNumero(data?.pendentes)}
          variant="amber"
          loading={loading}
          tooltip="Demandas cadastradas que ainda aguardam triagem (situação Pendente)."
        />
      </div>
    </div>
  );
}

function Painel({ titulo, subtitulo, indicador, vazio, children }) {
  const { data, loading, error, recarregar } = indicador;
  const itens = data?.itens ?? [];
  return (
    <ChartCard
      title={titulo}
      subtitle={subtitulo}
      actions={<DemoSeal />}
      loading={loading}
      error={error ? { message: mensagemDeErro(error) } : null}
      onRetry={recarregar}
      empty={!vazio ? itens.length === 0 : vazio(itens)}
    >
      {children(itens)}
    </ChartCard>
  );
}

const semDados = (campo) => (itens) => itens.every((i) => !i[campo]);

/** Dashboard ambiental (`/intelligence`): cards e gráficos de indicadores com filtros na URL. */
export default function IntelligenceDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtros = useMemo(
    () => Object.fromEntries(CAMPOS_FILTRO.map((c) => [c, searchParams.get(c) ?? ''])),
    [searchParams],
  );

  const { data: municipios } = useCarregar(listarMunicipios);
  const { data: biomas } = useCarregar(listarBiomas);
  const { data: categorias } = useCarregar(listarCategorias);

  const serie = useIndicador(obterSerieMensal, filtros);
  const situacao = useIndicador(obterPorSituacao, filtros);
  const municipio = useIndicador(obterPorMunicipio, filtros);
  const bioma = useIndicador(obterPorBioma, filtros);
  const categoria = useIndicador(obterPorCategoria, filtros);

  function aplicar(novos) {
    const params = new URLSearchParams();
    CAMPOS_FILTRO.forEach((campo) => novos[campo] && params.set(campo, novos[campo]));
    setSearchParams(params);
  }

  return (
    <>
      <PageHeader
        module="Intelligence"
        title="Dashboard ambiental"
        description="Indicadores das demandas de fiscalização em Mato Grosso, calculados sobre dados simulados."
        actions={<DemoSeal />}
      />

      <FiltrosAmbientais
        key={searchParams.toString()}
        inicial={filtros}
        municipios={municipios}
        biomas={biomas}
        categorias={categorias}
        onAplicar={aplicar}
        onLimpar={() => setSearchParams(new URLSearchParams())}
      />

      <section aria-label="Indicadores" className="mb-3">
        <CardsResumo filtros={filtros} />
      </section>

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <Painel
            titulo="Evolução mensal"
            subtitulo="Demandas cadastradas e finalizadas por mês"
            indicador={serie}
          >
            {(itens) => (
              <IndicatorChart
                tipo="line"
                ariaLabel="Evolução mensal de demandas cadastradas e finalizadas"
                labels={itens.map((i) => formatarMes(i.mes))}
                datasets={[
                  {
                    label: 'Cadastradas',
                    data: itens.map((i) => i.cadastradas),
                    color: CORES_SERIE[0],
                  },
                  {
                    label: 'Finalizadas',
                    data: itens.map((i) => i.finalizadas),
                    color: CORES_SERIE[1],
                  },
                ]}
              />
            )}
          </Painel>
        </div>

        <div className="col-12 col-xl-4">
          <Painel
            titulo="Por situação"
            subtitulo="Os 7 status do fluxo"
            indicador={situacao}
            vazio={semDados('total')}
          >
            {(itens) => (
              <IndicatorChart
                tipo="doughnut"
                ariaLabel="Demandas por situação"
                labels={itens.map((i) => i.rotulo)}
                datasets={[
                  {
                    label: 'Demandas',
                    data: itens.map((i) => i.total),
                    colors: itens.map((i, n) => CORES_STATUS[i.codigo] ?? corDaSerie(n)),
                  },
                ]}
              />
            )}
          </Painel>
        </div>

        <div className="col-12 col-xl-6">
          <Painel
            titulo="Por município"
            subtitulo={`Top ${TOP_MUNICIPIOS} municípios com mais demandas`}
            indicador={municipio}
          >
            {(itens) => {
              const top = itens.slice(0, TOP_MUNICIPIOS);
              return (
                <IndicatorChart
                  horizontal
                  ariaLabel={`Demandas por município (top ${TOP_MUNICIPIOS})`}
                  labels={top.map((i) => i.municipio)}
                  datasets={[
                    { label: 'Demandas', data: top.map((i) => i.total), color: CORES_SERIE[0] },
                  ]}
                />
              );
            }}
          </Painel>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <Painel
            titulo="Por bioma"
            subtitulo="Amazônia, Cerrado e Pantanal"
            indicador={bioma}
            vazio={semDados('total')}
          >
            {(itens) => (
              <IndicatorChart
                tipo="doughnut"
                ariaLabel="Demandas por bioma"
                labels={itens.map((i) => i.rotulo)}
                datasets={[
                  {
                    label: 'Demandas',
                    data: itens.map((i) => i.total),
                    colors: itens.map((i, n) => CORES_BIOMA[i.codigo] ?? corDaSerie(n)),
                  },
                ]}
              />
            )}
          </Painel>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <Painel titulo="Por categoria" subtitulo="Categoria ambiental" indicador={categoria}>
            {(itens) => (
              <IndicatorChart
                horizontal
                ariaLabel="Demandas por categoria ambiental"
                labels={itens.map((i) => i.rotulo)}
                datasets={[
                  { label: 'Demandas', data: itens.map((i) => i.total), color: CORES_SERIE[2] },
                ]}
              />
            )}
          </Painel>
        </div>
      </div>
    </>
  );
}
