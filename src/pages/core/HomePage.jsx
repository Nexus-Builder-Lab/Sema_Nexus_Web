import { Link } from 'react-router-dom';
import { obterDashboard } from '../../api/intelligenceApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import DemoSeal from '../../components/DemoSeal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';

const ATALHOS = [
  {
    to: '/intelligence',
    nome: 'SEMA Intelligence',
    descricao: 'Dashboards, mapa de Mato Grosso e indicadores ambientais simulados.',
  },
  {
    to: '/flux/demandas',
    nome: 'SEMA Flux',
    descricao: 'Demandas de fiscalização: cadastro, triagem, distribuição e conclusão.',
  },
  {
    to: '/docia/documentos',
    nome: 'SEMA DocIA',
    descricao: 'Biblioteca documental com busca textual e assistente em modo demonstrativo.',
  },
];

const TIPO_ATIVIDADE = {
  CADASTRO: 'Cadastro',
  EDICAO: 'Edição',
  TRIAGEM: 'Triagem',
  COMPLEMENTACAO: 'Complementação',
  DISTRIBUICAO: 'Distribuição',
  INICIO: 'Início do atendimento',
  ATIVIDADE: 'Atividade',
  FISCALIZACAO: 'Fiscalização',
  CONCLUSAO: 'Conclusão',
  DEVOLUCAO: 'Devolução',
  DOCUMENTO: 'Documento',
  EXCLUSAO: 'Exclusão',
};

const formatarNumero = (valor) => (valor == null ? null : Number(valor).toLocaleString('pt-BR'));

function AtividadesRecentes({ atividades }) {
  if (!atividades?.length) {
    return (
      <EmptyState
        title="Nenhuma atividade recente"
        message="As atividades das demandas aparecem aqui."
      />
    );
  }
  return (
    <ul className="list-group list-group-flush">
      {atividades.map((a, i) => (
        <li className="list-group-item px-0" key={`${a.data}-${i}`}>
          <div className="d-flex justify-content-between gap-2 flex-wrap">
            <span className="fw-semibold">{TIPO_ATIVIDADE[a.tipo] ?? a.tipo}</span>
            <time className="small text-body-secondary" dateTime={a.data}>
              {formatarData(a.data)}
            </time>
          </div>
          {a.texto && <div>{a.texto}</div>}
          <div className="small text-body-secondary">
            {a.demanda && (
              <Link to={`/flux/demandas/${a.demanda.id}`}>
                {a.demanda.numero}
                {a.demanda.titulo ? ` — ${a.demanda.titulo}` : ''}
              </Link>
            )}
            {a.usuario?.nome && <span> · {a.usuario.nome}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Dashboard inicial: indicadores gerais, atividades recentes e atalhos para os módulos. */
export default function HomePage() {
  const { data, loading, error, recarregar } = useCarregar(obterDashboard);
  const resumo = data?.resumo;

  return (
    <>
      <PageHeader
        module="Core"
        title="SEMA NEXUS"
        description="Plataforma demonstrativa de inteligência ambiental, gestão de demandas de fiscalização e gestão documental no contexto de Mato Grosso."
      />

      <section aria-labelledby="titulo-indicadores" className="mb-4">
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
          <h2 id="titulo-indicadores" className="h5 mb-0">
            Visão geral
          </h2>
          <DemoSeal />
        </div>
        {error ? (
          <ErrorState message={mensagemDeErro(error)} onRetry={recarregar} />
        ) : (
          <div className="row g-3">
            <div className="col-6 col-lg">
              <KpiCard
                label="Demandas totais"
                value={formatarNumero(resumo?.totalDemandas)}
                loading={loading}
                tooltip="Todas as demandas de fiscalização cadastradas, em qualquer situação."
              />
            </div>
            <div className="col-6 col-lg">
              <KpiCard
                label="Em andamento"
                value={formatarNumero(resumo?.emAndamento)}
                variant="blue"
                loading={loading}
                tooltip="Demandas com a fiscalização em curso (situação Em andamento)."
              />
            </div>
            <div className="col-6 col-lg">
              <KpiCard
                label="Finalizadas"
                value={formatarNumero(resumo?.finalizadas)}
                loading={loading}
                tooltip="Demandas concluídas (situação Finalizada)."
              />
            </div>
            <div className="col-6 col-lg">
              <KpiCard
                label="Atrasadas"
                value={formatarNumero(resumo?.atrasadas)}
                variant="red"
                loading={loading}
                tooltip="Demandas não finalizadas cujo prazo já passou."
              />
            </div>
            <div className="col-12 col-lg">
              <KpiCard
                label="Documentos"
                value={formatarNumero(resumo?.totalDocumentos)}
                variant="amber"
                loading={loading}
                tooltip="Documentos fictícios disponíveis na biblioteca documental."
              />
            </div>
          </div>
        )}
      </section>

      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-7">
          <section className="card h-100 shadow-sm" aria-labelledby="titulo-atividades">
            <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <h2 id="titulo-atividades" className="h6 mb-0">
                Atividades recentes
              </h2>
              <DemoSeal />
            </div>
            <div className="card-body">
              {loading && <Loading message="Carregando atividades..." />}
              {!loading && error && (
                <ErrorState message={mensagemDeErro(error)} onRetry={recarregar} />
              )}
              {!loading && !error && <AtividadesRecentes atividades={data?.atividadesRecentes} />}
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-5">
          <section aria-labelledby="titulo-atalhos">
            <h2 id="titulo-atalhos" className="h6">
              Atalhos para os módulos
            </h2>
            <div className="d-flex flex-column gap-3">
              {ATALHOS.map((atalho) => (
                <Link className="nx-atalho" to={atalho.to} key={atalho.to}>
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <h3 className="h6 text-primary">{atalho.nome}</h3>
                      <p className="mb-0 text-body-secondary">{atalho.descricao}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <p className="text-body-secondary small mb-0">
        Sem integração com sistemas institucionais. Todos os dados exibidos são simulados.
      </p>
    </>
  );
}
