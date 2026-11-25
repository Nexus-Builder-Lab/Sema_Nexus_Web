import { useCallback, useEffect, useMemo, useState } from 'react';
import { listarSetores } from '../../api/adminApi.js';
import { obterProdutividade } from '../../api/fluxApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import ChartCard from '../../components/ChartCard.jsx';
import DemoSeal from '../../components/DemoSeal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import IndicatorChart from '../../components/IndicatorChart.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { hojeISO } from '../../utils/datas.js';
import { rotuloCurtoSetor } from '../../utils/rotulos.js';

const PERIODOS = [
  { value: 3, label: 'Últimos 3 meses' },
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Últimos 12 meses' },
];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const dec = (v) => (v == null ? '—' : Number(v).toFixed(1).replace('.', ','));
const pct = (v) => (v == null ? '—' : `${Math.round(Number(v))}%`);
const dias = (v) => (v == null ? '—' : `${dec(v)} d`);

/** "2026-11" → "nov/26". */
function rotuloMes(mes) {
  const [ano, m] = String(mes).split('-');
  return `${MESES[Number(m) - 1] ?? m}/${String(ano).slice(2)}`;
}

/** Data inicial do recorte: hoje menos 30 dias por mês, como no protótipo. */
function dataInicial(meses) {
  const [a, m, d] = hojeISO().split('-').map(Number);
  const ini = new Date(a, m - 1, d - 30 * meses);
  return hojeISO(ini);
}

function aspas(v) {
  const t = String(v ?? '');
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** CSV (separador ";", vírgula decimal) com setores e responsáveis. */
export function gerarCsvProdutividade(r) {
  const cab = [
    'Nível',
    'Nome',
    'Total',
    'Concluídas',
    'Ativas',
    'Atrasadas',
    'Tempo médio (dias)',
    '% conclusão',
  ];
  const tempoPorSetor = new Map(r.tempoMedioPorSetor.map((t) => [t.setorId, t.tempoMedioDias]));
  const linhas = [
    ...r.porSetorSituacao.map((s) => [
      'Setor',
      s.setor,
      s.total,
      s.concluidas,
      s.ativas,
      s.atrasadas,
      tempoPorSetor.get(s.setorId) == null ? '' : dec(tempoPorSetor.get(s.setorId)),
      s.total ? `${Math.round((s.concluidas / s.total) * 100)}%` : '',
    ]),
    ...r.porResponsavel.map((x) => [
      'Responsável',
      x.fiscal,
      x.total,
      x.concluidas,
      x.ativas,
      x.atrasadas,
      x.tempoMedioDias == null ? '' : dec(x.tempoMedioDias),
      x.percentualConclusao == null ? '' : pct(x.percentualConclusao),
    ]),
  ];
  return [cab, ...linhas].map((l) => l.map(aspas).join(';')).join('\r\n');
}

function baixar(texto) {
  const url = URL.createObjectURL(new Blob(['﻿', texto], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `produtividade_${hojeISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Indicadores de produtividade do Flux (GET /api/flux/produtividade). */
export default function ProdutividadePage() {
  const [meses, setMeses] = useState(12);
  const [setorId, setSetorId] = useState('');
  const [setores, setSetores] = useState([]);
  const [aviso, setAviso] = useState('');

  // Perfis sem acesso à lista de setores (403) usam a tela sem o filtro de setor.
  useEffect(() => {
    let ativo = true;
    listarSetores().then(
      (lista) => ativo && setSetores((lista ?? []).filter((s) => s.ativo !== false)),
      () => {},
    );
    return () => {
      ativo = false;
    };
  }, []);

  const { data, loading, error, recarregar } = useCarregar(
    useCallback(
      () =>
        obterProdutividade({
          de: dataInicial(meses),
          ate: hojeISO(),
          ...(setorId ? { setorId } : {}),
        }),
      [meses, setorId],
    ),
  );

  const graficos = useMemo(() => {
    if (!data) return null;
    const ps = data.porSetorSituacao;
    const tempos = new Map(data.tempoMedioPorSetor.map((t) => [t.setorId, t.tempoMedioDias]));
    return {
      setores: ps.map((s) => rotuloCurtoSetor(s.setor)),
      setoresCompletos: ps.map((s) => s.setor),
      situacao: [
        { label: 'Concluídas', color: '#16a34a', data: ps.map((s) => s.concluidas) },
        { label: 'Ativas no prazo', color: '#1d4ed8', data: ps.map((s) => s.ativas - s.atrasadas) },
        { label: 'Atrasadas', color: '#dc2626', data: ps.map((s) => s.atrasadas) },
      ],
      tempo: [
        {
          label: 'Dias',
          color: '#166534',
          data: ps.map((s) => Number(tempos.get(s.setorId) ?? 0)),
        },
      ],
      meses: data.historicoMensal.map((m) => rotuloMes(m.mes)),
      historico: [
        {
          label: 'Recebidas',
          color: '#1d4ed8',
          data: data.historicoMensal.map((m) => m.recebidas),
        },
        {
          label: 'Concluídas',
          color: '#16a34a',
          data: data.historicoMensal.map((m) => m.concluidas),
        },
      ],
    };
  }, [data]);

  const k = data?.kpis;
  const responsaveis = data ? [...data.porResponsavel].sort((a, b) => b.total - a.total) : [];

  function exportar() {
    baixar(gerarCsvProdutividade(data));
    setAviso('Exportação concluída. Indicadores de produtividade exportados.');
  }

  return (
    <>
      <PageHeader
        module="Flux"
        title="Indicadores de produtividade"
        description="Desempenho por setor e por servidor, calculado a partir das demandas registradas (data de recebimento no período selecionado)."
        actions={
          <>
            <DemoSeal />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={exportar}
              disabled={!data}
            >
              <Icon name="download" size={16} /> Exportar CSV
            </button>
          </>
        }
      />
      {aviso && (
        <div className="alert alert-success py-2" role="status">
          {aviso}
        </div>
      )}
      <div className="card card-body shadow-sm mb-4">
        <div className="row g-3">
          <div className="col-12 col-sm-4 col-lg-2">
            <label className="form-label small" htmlFor="pd-periodo">
              Período
            </label>
            <select
              id="pd-periodo"
              className="form-select"
              value={meses}
              onChange={(e) => setMeses(Number(e.target.value))}
            >
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {setores.length > 0 && (
            <div className="col-12 col-sm-4 col-lg-2">
              <label className="form-label small" htmlFor="pd-setor">
                Setor
              </label>
              <select
                id="pd-setor"
                className="form-select"
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
              >
                <option value="">Todos</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sigla}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <ErrorState
          title="Não foi possível carregar a produtividade"
          message={mensagemDeErro(error)}
          onRetry={recarregar}
        />
      )}
      {loading && !data && <Loading label="Carregando produtividade" />}
      {data && (
        <div aria-busy={loading}>
          <div className="row g-3 mb-4">
            {[
              ['Demandas no período', k.demandasNoPeriodo, 'clipboard', 'green'],
              ['Concluídas', k.concluidas, 'check', 'blue'],
              [
                'Percentual de conclusão',
                pct(k.percentualConclusao),
                'pie',
                'amber',
                'Desconsidera canceladas',
              ],
              ['Tempo médio de conclusão', dias(k.tempoMedioConclusaoDias), 'clock', 'green'],
              ['Concluídas no prazo', pct(k.percentualConcluidasNoPrazo), 'check', 'green'],
              ['Atrasadas (ativas)', k.atrasadasAtivas, 'alarm', 'red'],
            ].map(([label, value, icon, variant, hint]) => (
              <div className="col-12 col-sm-6 col-xl-4 col-xxl-2" key={label}>
                <KpiCard label={label} value={value} icon={icon} variant={variant} hint={hint} />
              </div>
            ))}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-6">
              <ChartCard
                title="Demandas por setor e situação"
                empty={!data.porSetorSituacao.length}
                emptyMessage="Sem dados no período. Ajuste os filtros."
              >
                <IndicatorChart
                  stacked
                  labels={graficos.setores}
                  rotulosCompletos={graficos.setoresCompletos}
                  datasets={graficos.situacao}
                  ariaLabel="Demandas por setor e situação"
                />
              </ChartCard>
            </div>
            <div className="col-12 col-lg-6">
              <ChartCard
                title="Tempo médio de conclusão por setor (dias)"
                empty={!data.porSetorSituacao.length}
                emptyMessage="Sem dados no período. Ajuste os filtros."
              >
                <IndicatorChart
                  horizontal
                  labels={graficos.setores}
                  rotulosCompletos={graficos.setoresCompletos}
                  datasets={graficos.tempo}
                  ariaLabel="Tempo médio de conclusão por setor, em dias"
                />
              </ChartCard>
            </div>
          </div>

          <div className="mb-4">
            <ChartCard
              title="Histórico de produtividade"
              subtitle="Demandas recebidas × concluídas por mês"
              empty={!data.historicoMensal.length}
            >
              <IndicatorChart
                tipo="line"
                labels={graficos.meses}
                datasets={graficos.historico}
                ariaLabel="Demandas recebidas e concluídas por mês"
              />
            </ChartCard>
          </div>

          <section className="card shadow-sm" aria-label="Desempenho por responsável">
            <div className="card-header bg-white">
              <h2 className="h6 mb-0">Desempenho por responsável</h2>
              <div className="small text-body-secondary">Ordenado por quantidade de demandas</div>
            </div>
            {responsaveis.length ? (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Responsável</th>
                      <th scope="col" className="text-end">
                        Total
                      </th>
                      <th scope="col" className="text-end">
                        Concluídas
                      </th>
                      <th scope="col" className="text-end">
                        Ativas
                      </th>
                      <th scope="col" className="text-end">
                        Atrasadas
                      </th>
                      <th scope="col" className="text-end">
                        Tempo médio
                      </th>
                      <th scope="col" style={{ minWidth: 170 }}>
                        Conclusão
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {responsaveis.map((x) => {
                      const p = Math.round(Number(x.percentualConclusao ?? 0));
                      return (
                        <tr key={x.fiscalId ?? x.fiscal}>
                          <td className="fw-semibold">{x.fiscal}</td>
                          <td className="text-end">{x.total}</td>
                          <td className="text-end">{x.concluidas}</td>
                          <td className="text-end">{x.ativas}</td>
                          <td className="text-end">
                            {x.atrasadas ? (
                              <span className="nx-badge nx-badge-red">{x.atrasadas}</span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="text-end">{dias(x.tempoMedioDias)}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className="progress flex-grow-1"
                                role="progressbar"
                                aria-label={`Conclusão de ${x.fiscal}`}
                                aria-valuenow={p}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                style={{ height: 8 }}
                              >
                                <div
                                  className="progress-bar bg-success"
                                  style={{ width: `${p}%` }}
                                />
                              </div>
                              <span className="small">{p}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Sem dados no período" message="Ajuste os filtros." />
            )}
          </section>
        </div>
      )}
    </>
  );
}
