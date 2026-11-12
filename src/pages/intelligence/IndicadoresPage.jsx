import { useCallback, useMemo, useRef, useState } from 'react';
import { mensagemDeErro } from '../../api/httpClient.js';
import ChartCard from '../../components/ChartCard.jsx';
import DemoSeal from '../../components/DemoSeal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Icon from '../../components/Icon.jsx';
import IndicatorChart from '../../components/IndicatorChart.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData, hojeISO } from '../../utils/datas.js';
import {
  baixarArquivo,
  comporComparacao,
  formatarNumero,
  gerarCsvIndicador,
  gerarLeitura,
  INDICADORES,
  periodoAnterior,
  soma,
  somarDias,
} from './analiseIndicadores.js';

const TIPOS_GRAFICO = [
  { value: 'auto', label: 'Automático' },
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Linhas' },
  { value: 'doughnut', label: 'Distribuição (rosca)' },
];

/** Análise de indicadores: indicador + período + tipo de gráfico, com leitura e tabela dos dados. */
export default function IndicadoresPage() {
  const { showToast } = useToast();
  const chartRef = useRef(null);
  const [ind, setInd] = useState('recebidas_concluidas');
  const [de, setDe] = useState(() => somarDias(hojeISO(), -364));
  const [ate, setAte] = useState(() => hojeISO());
  const [grafico, setGrafico] = useState('auto');
  const [comparar, setComparar] = useState(false);
  const def = INDICADORES[ind];
  const periodoValido = Boolean(de) && Boolean(ate) && de <= ate;
  const podeComparar = comparar && !def.temporal;

  const carregar = useCallback(async () => {
    if (!periodoValido) return null;
    const atual = def.montar(await def.buscar({ de, ate }));
    if (!podeComparar) return atual;
    const anterior = def.montar(await def.buscar(periodoAnterior(de, ate)), atual.labels);
    return comporComparacao(atual, anterior);
  }, [def, de, ate, periodoValido, podeComparar]);
  const { data: r, loading, error, recarregar } = useCarregar(carregar);

  const vazio = Boolean(r) && (!r.labels.length || r.series.every((s) => s.data.every((v) => !v)));
  const tipo = !r ? 'bar' : grafico === 'auto' ? r.tipo : grafico;
  const leitura = useMemo(
    () => (r ? gerarLeitura(r, def, ind, podeComparar) : []),
    [r, def, ind, podeComparar],
  );
  const anterior = periodoValido ? periodoAnterior(de, ate) : null;
  const subtitulo = `${formatarData(de)} a ${formatarData(ate)}${
    podeComparar && anterior
      ? ` · comparado a ${formatarData(anterior.de)}–${formatarData(anterior.ate)}`
      : ''
  }`;
  const nomeArquivo = `indicador_${ind}_${hojeISO()}`;
  const carregando = loading && periodoValido;

  function baixarPng() {
    const imagem = !vazio && chartRef.current?.toBase64Image?.('image/png', 1);
    if (!imagem) {
      showToast({
        message: 'O gráfico não possui dados para exportar.',
        variant: 'warning',
        title: 'Nada para exportar',
      });
      return;
    }
    baixarArquivo(`${nomeArquivo}.png`, imagem);
    showToast({ message: 'Gráfico exportado em PNG.', title: 'Exportação concluída' });
  }
  function baixarCsv() {
    if (!r) return;
    baixarArquivo(
      `${nomeArquivo}.csv`,
      new Blob(['﻿', gerarCsvIndicador(r)], { type: 'text/csv;charset=utf-8' }),
    );
    showToast({ message: 'Dados exportados em CSV.', title: 'Exportação concluída' });
  }

  const series = r?.series ?? [];
  const semDados = !r || vazio;

  return (
    <>
      <PageHeader
        module="Intelligence"
        title="Análise de indicadores"
        description="Selecione um indicador e o período para gerar gráficos comparativos a partir dos dados registrados."
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={baixarPng}
              disabled={semDados}
            >
              <Icon name="image" size={16} className="me-1" />
              Baixar gráfico (PNG)
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={baixarCsv}
              disabled={semDados}
            >
              <Icon name="download" size={16} className="me-1" />
              Exportar dados (CSV)
            </button>
          </>
        }
      />

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-lg-4">
              <label htmlFor="ind-indicador" className="form-label small mb-1">
                Indicador
              </label>
              <select
                id="ind-indicador"
                className="form-select"
                value={ind}
                onChange={(e) => setInd(e.target.value)}
              >
                {Object.entries(INDICADORES).map(([id, d]) => (
                  <option key={id} value={id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label htmlFor="ind-de" className="form-label small mb-1">
                De
              </label>
              <input
                id="ind-de"
                type="date"
                className="form-control"
                value={de}
                onChange={(e) => setDe(e.target.value)}
              />
            </div>
            <div className="col-6 col-lg-2">
              <label htmlFor="ind-ate" className="form-label small mb-1">
                Até
              </label>
              <input
                id="ind-ate"
                type="date"
                className="form-control"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
              />
            </div>
            <div className="col-6 col-lg-2">
              <label htmlFor="ind-setor" className="form-label small mb-1">
                Setor (demandas)
              </label>
              <select
                id="ind-setor"
                className="form-select"
                disabled
                value=""
                aria-describedby="ind-setor-nota"
                onChange={() => {}}
              >
                <option value="">Todos</option>
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label htmlFor="ind-grafico" className="form-label small mb-1">
                Tipo de gráfico
              </label>
              <select
                id="ind-grafico"
                className="form-select"
                value={grafico}
                onChange={(e) => setGrafico(e.target.value)}
              >
                {TIPOS_GRAFICO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-check mt-3">
            <input
              id="ind-comparar"
              type="checkbox"
              className="form-check-input"
              checked={comparar}
              onChange={(e) => setComparar(e.target.checked)}
            />
            <label htmlFor="ind-comparar" className="form-check-label small">
              Comparar com o período anterior de mesma duração (indicadores não mensais)
            </label>
          </div>
          <p id="ind-setor-nota" className="small text-body-secondary mb-0 mt-1">
            Filtro por setor indisponível: a API ainda não expõe indicadores por setor (pendência de
            contrato).
          </p>
          {!periodoValido && (
            <div className="alert alert-warning mt-3 mb-0" role="alert">
              Período inválido: a data inicial deve ser anterior ou igual à final.
            </div>
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-8">
          <ChartCard
            title={def.label}
            subtitle={subtitulo}
            actions={<DemoSeal />}
            loading={carregando}
            error={error ? { message: mensagemDeErro(error) } : null}
            onRetry={recarregar}
            empty={!periodoValido || vazio}
            emptyMessage="Sem dados para o período selecionado. Amplie o período."
          >
            {r && !vazio && (
              <IndicatorChart
                chartRef={chartRef}
                tipo={tipo === 'hbar' ? 'bar' : tipo}
                horizontal={tipo === 'hbar'}
                altura={340}
                ariaLabel={`Gráfico: ${def.label}`}
                labels={r.labels}
                datasets={r.series}
              />
            )}
          </ChartCard>
        </div>
        <div className="col-12 col-xl-4">
          <section className="card h-100 shadow-sm" aria-label="Leitura dos dados">
            <div className="card-header bg-white">
              <h2 className="h6 mb-0">
                <Icon name="lightbulb" size={16} className="me-2" />
                Leitura dos dados
              </h2>
            </div>
            <div className="card-body">
              {carregando ? (
                <Loading />
              ) : leitura.length ? (
                <ul className="ps-3 mb-0">
                  {leitura.map((l) => (
                    <li key={l.chave}>
                      {l.antes}
                      <strong>{l.forte}</strong>
                      {l.depois}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-secondary">Sem dados para interpretar.</p>
              )}
              <p className="small text-body-secondary mt-3 mb-0">
                Leitura gerada por cálculos estatísticos simples sobre os dados registrados (não
                utiliza IA).
              </p>
            </div>
          </section>
        </div>
      </div>

      <section className="card shadow-sm mt-3" aria-label="Dados do gráfico">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">
            <Icon name="table" size={16} className="me-2" />
            Dados do gráfico
          </h2>
        </div>
        {r && !vazio ? (
          <div className="table-responsive">
            <table className="table table-sm mb-0 align-middle">
              <thead>
                <tr>
                  <th scope="col">Categoria</th>
                  {series.map((s) => (
                    <th scope="col" className="text-end" key={s.label}>
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.labels.map((l, i) => (
                  <tr key={`${l}-${i}`}>
                    <td>{l}</td>
                    {series.map((s) => (
                      <td className="text-end" key={s.label}>
                        {formatarNumero(s.data[i])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="fw-semibold">
                  <td>Total</td>
                  {series.map((s) => (
                    <td className="text-end" key={s.label}>
                      {formatarNumero(soma(s.data))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body">
            {carregando ? (
              <Loading />
            ) : (
              <EmptyState title="Sem dados" message="Nenhum dado para o período selecionado." />
            )}
          </div>
        )}
      </section>
    </>
  );
}
