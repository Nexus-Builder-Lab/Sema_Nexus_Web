import { Link } from 'react-router-dom';
import { listarPrazos, obterProdutividade, obterResumoPrazos } from '../../api/fluxApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import {
  obterDashboard,
  obterMapa,
  obterPorMunicipio,
  obterSerieMensal,
} from '../../api/intelligenceApi.js';
import { PERFIS_RELATORIOS, PERFIS_SENTINELA, podeEditarDemandas } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import ChartCard from '../../components/ChartCard.jsx';
import DemoSeal from '../../components/DemoSeal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import IndicatorChart from '../../components/IndicatorChart.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { CORES_STATUS } from '../../utils/paleta.js';
import { rotuloCurtoSetor } from '../../utils/rotulos.js';
import SentinelaPanel from '../intelligence/SentinelaPanel.jsx';

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

const AZUL = '#1d4ed8';
const VERDE = '#22c55e';
const LARANJA = '#ea580c';
const MESES_NO_GRAFICO = 12;
const TOP_MUNICIPIOS = 10;
const DIAS_ALERTA = 5;

const formatarNumero = (valor) => (valor == null ? null : Number(valor).toLocaleString('pt-BR'));
const percentual = (parte, total) => (total ? `${Math.round((parte / total) * 100)}%` : '0%');

// Funções estáveis para o `useCarregar` (a mudança de função dispara nova carga).
const carregarSerie = () => obterSerieMensal();
const carregarMunicipios = () => obterPorMunicipio();
const carregarMapa = () => obterMapa();
const carregarResumoPrazos = () => obterResumoPrazos(DIAS_ALERTA);
const carregarProdutividade = () => obterProdutividade();
async function carregarAtencao() {
  const [vencidas, proximas] = await Promise.all([
    listarPrazos({ estado: 'VENCIDA', size: 7 }),
    listarPrazos({ estado: 'PROXIMA', size: 7 }),
  ]);
  return [...(vencidas.content ?? []), ...(proximas.content ?? [])].slice(0, 7);
}

function saudacao(agora = new Date()) {
  const hora = agora.getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

/** "2026-10" → "out/26". */
function rotuloMes(mes) {
  const [ano, numero] = String(mes).split('-');
  const nomes = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  return `${nomes[Number(numero) - 1] ?? numero}/${String(ano).slice(2)}`;
}

function iniciais(nome) {
  return String(nome ?? 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function Painel({ titulo, icone, carga, vazio, children, subtitulo, altura }) {
  const { data, loading, error, recarregar } = carga;
  return (
    <ChartCard
      title={
        <span className="d-inline-flex align-items-center gap-2">
          <Icon name={icone} size={15} />
          {titulo}
        </span>
      }
      subtitle={subtitulo}
      actions={<DemoSeal />}
      loading={loading}
      error={error ? { message: mensagemDeErro(error) } : null}
      onRetry={recarregar}
      empty={!loading && !error && vazio(data)}
    >
      {data && children(data, altura)}
    </ChartCard>
  );
}

function ListaCard({ titulo, icone, link, children }) {
  return (
    <section className="card h-100 shadow-sm" aria-label={titulo}>
      <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <h2 className="h6 mb-0 d-inline-flex align-items-center gap-2">
          <Icon name={icone} size={15} />
          {titulo}
        </h2>
        <span className="d-flex align-items-center gap-2">
          {link}
          <DemoSeal />
        </span>
      </div>
      <div className="card-body">{children}</div>
    </section>
  );
}

function DemandasAtencao({ carga }) {
  const { data, loading, error, recarregar } = carga;
  if (loading) return <Loading message="Carregando prazos..." />;
  if (error) return <ErrorState message={mensagemDeErro(error)} onRetry={recarregar} />;
  if (!data?.length) {
    return (
      <EmptyState title="Nenhuma demanda crítica" message="Todos os prazos estão sob controle." />
    );
  }
  return (
    <ul className="nx-lista">
      {data.map((d) => {
        const vencida = d.estado === 'VENCIDA';
        const prazo = vencida
          ? `${d.diasAtraso} dia(s) de atraso`
          : `vence em ${d.diasRestantes} dia(s)`;
        return (
          <li className="nx-lista-item" key={d.id}>
            <span className={`nx-kpi-ico nx-kpi-ico-${vencida ? 'red' : 'amber'}`}>
              <Icon name={vencida ? 'alarm' : 'clock'} size={16} />
            </span>
            <div className="nx-lista-main">
              <Link className="nx-lista-titulo" to={`/flux/demandas/${d.id}`}>
                {d.numero} — {d.titulo}
              </Link>
              <div className="nx-lista-sub">
                {[d.equipe, d.fiscal].filter(Boolean).join(' · ')} · {prazo} (
                {formatarData(d.prazo)})
              </div>
            </div>
            <PriorityBadge prioridade={d.prioridade} />
          </li>
        );
      })}
    </ul>
  );
}

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
    <ul className="nx-lista">
      {atividades.map((a, i) => (
        <li className="nx-lista-item" key={`${a.data}-${i}`}>
          <span className="nx-avatar" aria-hidden="true">
            {iniciais(a.usuario?.nome)}
          </span>
          <div className="nx-lista-main">
            <div className="nx-lista-titulo">
              <span className="fw-semibold">{TIPO_ATIVIDADE[a.tipo] ?? a.tipo}</span>
              {a.demanda && (
                <>
                  {' · '}
                  <Link to={`/flux/demandas/${a.demanda.id}`}>
                    {a.demanda.numero}
                    {a.demanda.titulo ? ` — ${a.demanda.titulo}` : ''}
                  </Link>
                </>
              )}
            </div>
            {a.texto && <div className="nx-lista-sub">{a.texto}</div>}
            <div className="nx-lista-sub">
              {a.usuario?.nome ?? 'Sistema'} · <time dateTime={a.data}>{formatarData(a.data)}</time>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Dashboard executivo (Início): saudação, 8 indicadores, gráficos e listas de atenção e atividades. */
export default function HomePage() {
  const { usuario } = useAuth();
  const dashboard = useCarregar(obterDashboard);
  const serie = useCarregar(carregarSerie);
  const municipios = useCarregar(carregarMunicipios);
  const mapa = useCarregar(carregarMapa);
  const prazos = useCarregar(carregarResumoPrazos);
  const produtividade = useCarregar(carregarProdutividade);
  const atencao = useCarregar(carregarAtencao);

  const { data, loading, error, recarregar } = dashboard;
  const resumo = data?.resumo;
  const nome = String(usuario?.nome ?? '').split(' ')[0];
  const dataHoje = formatarData(new Date().toISOString());
  const andamentoTotal = resumo ? resumo.emAndamento + (resumo.pendentes ?? 0) : null;
  const itensMunicipios = municipios.data?.itens ?? [];
  const pontos = mapa.data?.pontos;

  const acoes = (
    <>
      {PERFIS_RELATORIOS.includes(usuario?.perfil) && (
        <Link
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
          to="/intelligence/relatorios"
        >
          <Icon name="file" size={15} />
          Relatórios
        </Link>
      )}
      {podeEditarDemandas(usuario) && (
        <Link
          className="btn btn-primary d-inline-flex align-items-center gap-2"
          to="/flux/demandas/nova"
        >
          <Icon name="plus" size={15} />
          Nova demanda
        </Link>
      )}
    </>
  );

  const kpi = (props) => <KpiCard loading={loading} {...props} />;

  return (
    <>
      <PageHeader
        module="Intelligence"
        title={`${saudacao()}${nome ? `, ${nome}` : ''}`}
        description={`Panorama em ${dataHoje} — demandas de fiscalização, documentos e ocorrências ambientais em Mato Grosso.`}
        actions={acoes}
      />

      {PERFIS_SENTINELA.includes(usuario?.perfil) && <SentinelaPanel />}

      {error ? (
        <div className="mb-4">
          <ErrorState message={mensagemDeErro(error)} onRetry={recarregar} />
        </div>
      ) : (
        <section aria-label="Indicadores" className="mb-4">
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Total de demandas',
                value: formatarNumero(resumo?.totalDemandas),
                icon: 'clipboard',
                hint: 'Em qualquer situação',
                tooltip: 'Todas as demandas de fiscalização cadastradas, em qualquer situação.',
              })}
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Em andamento',
                value: formatarNumero(andamentoTotal),
                variant: 'blue',
                icon: 'loader',
                hint: 'Pendentes, em triagem ou em fiscalização',
                tooltip: 'Demandas ainda não finalizadas: pendentes e em andamento.',
              })}
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Concluídas',
                value: formatarNumero(resumo?.finalizadas),
                variant: 'violet',
                icon: 'check',
                hint: resumo
                  ? `${percentual(resumo.finalizadas, resumo.totalDemandas)} do total`
                  : undefined,
                tooltip: 'Demandas concluídas (situação Finalizada).',
              })}
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Atrasadas',
                value: formatarNumero(resumo?.atrasadas),
                variant: 'red',
                icon: 'alarm',
                hint: prazos.data
                  ? `${prazos.data.proximas} vencem nos próximos ${DIAS_ALERTA} dias`
                  : undefined,
                tooltip: 'Demandas não finalizadas cujo prazo já passou.',
              })}
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Documentos cadastrados',
                value: formatarNumero(resumo?.totalDocumentos),
                variant: 'gray',
                icon: 'folder',
                hint: 'Biblioteca documental fictícia',
                tooltip: 'Documentos fictícios disponíveis na biblioteca documental.',
              })}
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Demandas georreferenciadas',
                value: formatarNumero(pontos?.length),
                variant: 'amber',
                icon: 'pin',
                hint: 'Com coordenadas no mapa',
                tooltip: 'Demandas com localização no mapa de Mato Grosso.',
              })}
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Municípios atendidos',
                value: formatarNumero(municipios.data ? itensMunicipios.length : null),
                variant: 'red',
                icon: 'map',
                hint: 'Com ao menos uma demanda',
                tooltip: 'Municípios de Mato Grosso com ao menos uma demanda registrada.',
              })}
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              {kpi({
                label: 'Fiscalizações registradas',
                value: formatarNumero(resumo?.fiscalizacoes),
                icon: 'activity',
                hint: 'Atividades de campo nas demandas',
                tooltip: 'Fiscalizações registradas nas demandas.',
              })}
            </div>
          </div>
        </section>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-8">
          <Painel
            titulo="Evolução mensal das atividades"
            icone="lineChart"
            subtitulo="Últimos 12 meses"
            carga={serie}
            vazio={(d) => !d?.itens?.length}
          >
            {(d) => {
              const itens = d.itens.slice(-MESES_NO_GRAFICO);
              return (
                <IndicatorChart
                  labels={itens.map((i) => rotuloMes(i.mes))}
                  datasets={[
                    {
                      label: 'Taxa de conclusão (%)',
                      data: itens.map((i) =>
                        i.cadastradas ? Math.round((i.finalizadas / i.cadastradas) * 100) : 0,
                      ),
                      color: LARANJA,
                      linha: true,
                      eixoDireito: true,
                    },
                    {
                      label: 'Demandas recebidas',
                      data: itens.map((i) => i.cadastradas),
                      color: AZUL,
                    },
                    {
                      label: 'Demandas concluídas',
                      data: itens.map((i) => i.finalizadas),
                      color: VERDE,
                    },
                  ]}
                  tituloEixo="Demandas"
                  tituloEixoDireito="Conclusão (%)"
                  ariaLabel="Demandas recebidas e concluídas por mês, com taxa de conclusão"
                  altura={300}
                />
              );
            }}
          </Painel>
        </div>
        <div className="col-12 col-xl-4">
          <ChartCard
            title={
              <span className="d-inline-flex align-items-center gap-2">
                <Icon name="pie" size={15} />
                Demandas por situação
              </span>
            }
            actions={<DemoSeal />}
            loading={loading}
            error={error ? { message: mensagemDeErro(error) } : null}
            onRetry={recarregar}
            empty={!loading && !error && !data?.porSituacao?.some((s) => s.total > 0)}
          >
            {data && (
              <IndicatorChart
                tipo="doughnut"
                labels={data.porSituacao.map((s) => s.rotulo)}
                datasets={[
                  {
                    label: 'Demandas',
                    data: data.porSituacao.map((s) => s.total),
                    colors: data.porSituacao.map((s) => CORES_STATUS[s.codigo] ?? '#9ca3af'),
                  },
                ]}
                ariaLabel="Demandas por situação"
                altura={300}
              />
            )}
          </ChartCard>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-6">
          <Painel
            titulo="Municípios com mais demandas"
            icone="pin"
            carga={municipios}
            vazio={(d) => !d?.itens?.length}
          >
            {(d) => {
              const top = d.itens.slice(0, TOP_MUNICIPIOS);
              return (
                <IndicatorChart
                  horizontal
                  labels={top.map((m) => m.municipio)}
                  datasets={[{ label: 'Demandas', data: top.map((m) => m.total), color: LARANJA }]}
                  ariaLabel="Municípios com mais demandas"
                  altura={300}
                />
              );
            }}
          </Painel>
        </div>
        <div className="col-12 col-xl-6">
          <Painel
            titulo="Demandas ativas por setor"
            icone="building"
            carga={produtividade}
            vazio={(d) => !d?.porSetorSituacao?.some((s) => s.ativas > 0)}
          >
            {(d) => {
              const setores = d.porSetorSituacao.filter((s) => s.ativas > 0);
              return (
                <IndicatorChart
                  horizontal
                  stacked
                  labels={setores.map((s) => rotuloCurtoSetor(s.setor))}
                  rotulosCompletos={setores.map((s) => s.setor)}
                  datasets={[
                    {
                      label: 'No prazo',
                      data: setores.map((s) => s.ativas - s.atrasadas),
                      color: '#16a34a',
                    },
                    { label: 'Vencidas', data: setores.map((s) => s.atrasadas), color: '#dc2626' },
                  ]}
                  ariaLabel="Demandas ativas por setor, no prazo e vencidas"
                  altura={300}
                />
              );
            }}
          </Painel>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-6">
          <ListaCard
            titulo="Demandas que exigem atenção"
            icone="alert"
            link={
              <Link className="small" to="/flux/painel">
                Ver painel de fiscalização
              </Link>
            }
          >
            <DemandasAtencao carga={atencao} />
          </ListaCard>
        </div>
        <div className="col-12 col-xl-6">
          <ListaCard titulo="Atividades recentes" icone="activity">
            {loading && <Loading message="Carregando atividades..." />}
            {!loading && error && (
              <p className="text-body-secondary mb-0">
                Atividades indisponíveis: veja o aviso de erro acima.
              </p>
            )}
            {!loading && !error && <AtividadesRecentes atividades={data?.atividadesRecentes} />}
          </ListaCard>
        </div>
      </div>

      <p className="text-body-secondary small mb-0">
        SEMA ALERTA · Ambiente demonstrativo. Sem integração com sistemas institucionais; todos os
        dados exibidos são fictícios.
      </p>
    </>
  );
}
