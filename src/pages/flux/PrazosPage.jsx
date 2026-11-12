import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarPrazos, obterResumoPrazos } from '../../api/fluxApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import DemoSeal from '../../components/DemoSeal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';

const ABAS = [
  { id: 'VENCIDA', label: 'Vencidas', icon: 'alarm', chave: 'vencidas' },
  { id: 'PROXIMA', label: 'Próximas do vencimento', icon: 'clock', chave: 'proximas' },
  { id: 'NO_PRAZO', label: 'Dentro do prazo', icon: 'check', chave: 'noPrazo' },
  { id: 'CONCLUIDA', label: 'Concluídas', icon: 'check', chave: 'concluidas' },
];
const DIAS_ALERTA = 5;

const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '0%');

function Caixa({ item }) {
  const { estado, diasAtraso, diasRestantes } = item;
  if (estado === 'VENCIDA')
    return (
      <div className="nx-deadline-days nx-deadline-red">
        <strong>{diasAtraso ?? 0}</strong>
        <span>dias atraso</span>
      </div>
    );
  if (estado === 'PROXIMA')
    return (
      <div className="nx-deadline-days nx-deadline-amber">
        <strong>{diasRestantes ?? 0}</strong>
        <span>{diasRestantes === 0 ? 'hoje' : 'dias'}</span>
      </div>
    );
  if (estado === 'CONCLUIDA')
    return diasAtraso > 0 ? (
      <div className="nx-deadline-days nx-deadline-amber">
        <Icon name="clock" size={16} />
        <span>+{diasAtraso}d</span>
      </div>
    ) : (
      <div className="nx-deadline-days nx-deadline-green">
        <Icon name="check" size={16} />
        <span>no prazo</span>
      </div>
    );
  return (
    <div className="nx-deadline-days nx-deadline-green">
      <strong>{diasRestantes ?? '—'}</strong>
      <span>dias</span>
    </div>
  );
}

function Lista({ estado }) {
  const { data, loading, error, recarregar } = useCarregar(
    useCallback(() => listarPrazos({ estado, size: 100 }), [estado]),
  );
  if (loading) return <Loading label="Carregando demandas" />;
  if (error)
    return (
      <ErrorState
        title="Não foi possível carregar a lista"
        message={mensagemDeErro(error)}
        onRetry={recarregar}
      />
    );
  const itens = data?.content ?? [];
  if (!itens.length) return <EmptyState title="Nenhuma demanda nesta categoria" />;
  return (
    <ul className="list-unstyled mb-0">
      {itens.map((i) => (
        <li key={i.id} className="nx-deadline-item">
          <Caixa item={i} />
          <div className="flex-grow-1 min-w-0">
            <Link
              to={`/flux/demandas/${i.id}`}
              className="fw-semibold text-body text-decoration-none"
            >
              {i.numero} — {i.titulo}
            </Link>
            <div className="small text-body-secondary">
              {[i.equipe, i.fiscal].filter(Boolean).join(' · ')}
              {i.municipio ? ` · ${i.municipio}` : ''} · prazo {formatarData(i.prazo)}
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap justify-content-end">
            <PriorityBadge prioridade={i.prioridade} />
            <StatusBadge status={i.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Controle de prazos do Flux: alerta de vencidas, 4 KPIs e abas com listas (GET /api/flux/prazos*). */
export default function PrazosPage() {
  const [aba, setAba] = useState('VENCIDA');
  const resumo = useCarregar(useCallback(() => obterResumoPrazos(), []));
  const r = resumo.data;
  const concl = r ? r.concluidasNoPrazo + r.concluidasComAtraso : 0;
  const contagens = r && { ...r, concluidas: concl };
  const ativas = r ? r.vencidas + r.proximas + r.noPrazo : 0;

  return (
    <>
      <PageHeader
        module="Flux"
        title="Controle de prazos"
        description={`Acompanhamento de vencimentos. Demandas que vencem em até ${DIAS_ALERTA} dias são sinalizadas como próximas do vencimento.`}
        actions={<DemoSeal />}
      />
      {resumo.error && (
        <ErrorState
          title="Não foi possível carregar o resumo de prazos"
          message={mensagemDeErro(resumo.error)}
          onRetry={resumo.recarregar}
        />
      )}
      {resumo.loading && <Loading label="Carregando prazos" />}
      {r &&
        (r.vencidas > 0 ? (
          <div className="alert alert-danger d-flex gap-2 mb-4" role="alert">
            <Icon name="alarm" className="mt-1" />
            <div>
              <strong>
                {plural(r.vencidas, 'demanda vencida requer', 'demandas vencidas requerem')} atenção
                imediata.
              </strong>
              {r.maisAntigaVencida && (
                <div>
                  A mais antiga está atrasada há{' '}
                  {plural(r.maisAntigaVencida.diasAtraso, 'dia', 'dias')} (
                  {r.maisAntigaVencida.numero}).
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-success d-flex gap-2 mb-4" role="status">
            <Icon name="check" className="mt-1" />
            <div>
              <strong>Nenhuma demanda vencida.</strong>
              <div>Todas as demandas ativas estão dentro do prazo.</div>
            </div>
          </div>
        ))}
      {r && (
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <KpiCard
              label="Vencidas"
              value={r.vencidas}
              icon="alarm"
              variant="red"
              hint={`${pct(r.vencidas, ativas)} das demandas ativas`}
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <KpiCard
              label="Próximas do vencimento"
              value={r.proximas}
              icon="clock"
              variant="amber"
              hint={`Vencem em até ${DIAS_ALERTA} dias`}
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <KpiCard
              label="Dentro do prazo"
              value={r.noPrazo}
              icon="check"
              variant="green"
              hint="Demandas ativas sem risco imediato"
            />
          </div>
          <div className="col-12 col-sm-6 col-xl-3">
            <KpiCard
              label="Concluídas"
              value={concl}
              icon="check"
              variant="blue"
              hint={`${pct(r.concluidasNoPrazo, concl)} concluídas dentro do prazo`}
            />
          </div>
        </div>
      )}
      <div className="card shadow-sm">
        <div className="card-body pb-0">
          <ul className="nav nav-tabs nx-prazo-tabs" role="tablist">
            {ABAS.map((a) => (
              <li className="nav-item" role="presentation" key={a.id}>
                <button
                  type="button"
                  role="tab"
                  id={`aba-${a.id}`}
                  aria-selected={aba === a.id}
                  aria-controls="painel-prazos"
                  className={`nav-link ${aba === a.id ? 'active' : ''}`}
                  onClick={() => setAba(a.id)}
                >
                  <Icon name={a.icon} size={14} /> {a.label}
                  {contagens && (
                    <span className="nx-badge nx-badge-gray ms-1">{contagens[a.chave]}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div id="painel-prazos" role="tabpanel" aria-labelledby={`aba-${aba}`} className="p-3">
          <Lista key={aba} estado={aba} />
        </div>
      </div>
    </>
  );
}
