import { Link } from 'react-router-dom';
import { obterBriefingSentinela, segundosRetryAfter } from '../../api/sentinelaApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import DemoSeal from '../../components/DemoSeal.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import Loading from '../../components/Loading.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { agruparAnomalias, destinoDaAcao } from './sentinelaAcoes.js';

const MODOS = {
  LOCAL: { rotulo: 'IA local', classe: 'text-bg-success' },
  CLAUDE: { rotulo: 'Claude', classe: 'text-bg-primary' },
  DEMONSTRATIVO: { rotulo: 'Modo demonstrativo', classe: 'text-bg-secondary' },
};
const SEVERIDADES = {
  ALTA: { rotulo: 'Severidade alta', classe: 'text-bg-danger' },
  MEDIA: { rotulo: 'Severidade média', classe: 'text-bg-warning' },
  BAIXA: { rotulo: 'Severidade baixa', classe: 'text-bg-info' },
};
const ROTULOS_NUMEROS = {
  focos: 'Focos de calor',
  deter: 'Alertas DETER',
  total: 'Total de registros',
  demandasAbertas: 'Demandas abertas',
  janelaDias: 'Janela (dias)',
  registrosNoAgrupamento: 'Registros no agrupamento',
  noStatus: 'Demandas no status',
  paradas: 'Paradas',
  filaDias: 'Limite de dias parada',
  diasMaisAntiga: 'Dias da mais antiga',
  maisAntiga: 'Mais antiga',
  ativas: 'Ativas',
  atrasadas: 'Atrasadas',
  ativasPorFiscal: 'Ativas por fiscal',
  atrasadasPorFiscal: 'Atrasadas por fiscal',
  limiteAtivasPorFiscal: 'Limite de ativas por fiscal',
  limiteAtrasadasPorFiscal: 'Limite de atrasadas por fiscal',
};

const carregarBriefing = () => obterBriefingSentinela();

function formatarMomento(iso) {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
}
const formatarValor = (v) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v));

function Anomalia({ anomalia }) {
  const sev = SEVERIDADES[anomalia.severidade] ?? {
    rotulo: anomalia.severidade,
    classe: 'text-bg-secondary',
  };
  const numeros = Object.entries(anomalia.numeros ?? {}).filter(
    ([, v]) => v != null && typeof v !== 'object',
  );
  const acoes = (anomalia.acoes ?? [])
    .map((acao) => ({ acao, destino: destinoDaAcao(acao) }))
    .filter((x) => x.destino);
  return (
    <li className="border rounded p-3 mb-2" data-testid="sentinela-anomalia">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
        <span className={`badge ${sev.classe}`}>{sev.rotulo}</span>
        {anomalia.assunto && <span className="badge text-bg-light border">{anomalia.assunto}</span>}
        <h5 className="h6 mb-0">{anomalia.titulo}</h5>
      </div>
      <p className="mb-2 small">{anomalia.descricao}</p>
      {numeros.length > 0 && (
        <dl className="row small mb-2 g-1">
          {numeros.map(([chave, valor]) => (
            <div key={chave} className="col-6 col-md-4 col-xl-3">
              <dt className="fw-normal text-body-secondary">{ROTULOS_NUMEROS[chave] ?? chave}</dt>
              <dd className="mb-0 fw-semibold">{formatarValor(valor)}</dd>
            </div>
          ))}
        </dl>
      )}
      {acoes.length > 0 && (
        <div className="d-flex flex-wrap gap-2">
          {acoes.map(({ acao, destino }) => (
            <Link
              key={`${acao.tipo}:${destino}`}
              to={destino}
              className="btn btn-sm btn-outline-primary"
            >
              {acao.rotulo}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
}

/** Painel "Sentinela Territorial & Briefing Executivo" (ADMIN/GESTOR; GH-142). Só leitura e atalhos. */
export default function SentinelaPanel() {
  const { data, loading, error, recarregar } = useCarregar(carregarBriefing);
  const status = error?.response?.status;
  if (status === 403) return null;

  let conteudo;
  if (loading) {
    conteudo = <Loading message="Carregando o briefing da Sentinela..." />;
  } else if (status === 503) {
    const s = segundosRetryAfter(error);
    conteudo = (
      <div className="alert alert-info mb-0" role="status">
        <p className="fw-semibold mb-1">O briefing ainda não foi gerado.</p>
        <p className="mb-2">
          A rotina diária da Sentinela ainda não produziu o primeiro briefing
          {s ? `; tente novamente em cerca de ${s} s.` : '; tente novamente em instantes.'}
        </p>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={recarregar}>
          Tentar novamente
        </button>
      </div>
    );
  } else if (error) {
    conteudo = (
      <ErrorState
        title="Não foi possível carregar o briefing"
        message={mensagemDeErro(error)}
        onRetry={recarregar}
      />
    );
  } else {
    const modo = MODOS[data.modo] ?? { rotulo: data.modo, classe: 'text-bg-secondary' };
    const grupos = agruparAnomalias(data.anomalias);
    conteudo = (
      <>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span className={`badge ${modo.classe}`} data-testid="sentinela-modo">
            {modo.rotulo}
            {data.modelo ? ` · ${data.modelo}` : ''}
          </span>
          <span className="small text-body-secondary">
            Gerado em {formatarMomento(data.geradoEm)} · válido até{' '}
            {formatarMomento(data.validoAte)}
          </span>
        </div>
        <p className="mb-3" data-testid="sentinela-resumo">
          {data.resumo}
        </p>
        {(data.avisos ?? []).length > 0 && (
          <ul className="alert alert-warning small ps-4 mb-3" aria-label="Avisos do briefing">
            {data.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        )}
        {grupos.length === 0 ? (
          <p className="text-body-secondary" data-testid="sentinela-vazio">
            Nenhuma anomalia detectada pelas regras da Sentinela neste briefing.
          </p>
        ) : (
          grupos.map((g) => (
            <section key={g.tipo} className="mb-3" aria-labelledby={`sentinela-${g.tipo}`}>
              <h4 className="h6" id={`sentinela-${g.tipo}`}>
                {g.rotulo} ({g.itens.length})
              </h4>
              <ul className="list-unstyled mb-0">
                {g.itens.map((a) => (
                  <Anomalia key={a.id} anomalia={a} />
                ))}
              </ul>
            </section>
          ))
        )}
        <p className="small text-body-secondary mb-0">
          Focos de calor e alertas DETER são dados públicos do INPE; demandas e equipes são
          fictícias. As ações apenas abrem telas filtradas ou o cadastro pré-preenchido: nada é
          gravado sem a sua confirmação.
        </p>
      </>
    );
  }

  return (
    <section
      className="card shadow-sm mb-4"
      aria-labelledby="sentinela-titulo"
      data-testid="sentinela-painel"
    >
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <h3 className="h5 mb-0 d-flex align-items-center gap-2" id="sentinela-titulo">
            <Icon name="alert" size={18} />
            Sentinela Territorial &amp; Briefing Executivo
          </h3>
          <DemoSeal />
        </div>
        {conteudo}
      </div>
    </section>
  );
}
