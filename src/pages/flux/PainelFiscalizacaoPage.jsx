import { listarDemandas } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import {
  obterPorCategoria,
  obterPorMunicipio,
  obterPorSituacao,
  obterResumo,
  obterSerieMensal,
} from '../../api/intelligenceApi.js';
import ChartCard from '../../components/ChartCard.jsx';
import DemoSeal from '../../components/DemoSeal.jsx';
import IndicatorChart from '../../components/IndicatorChart.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useIndicador from '../../hooks/useIndicador.js';
import { CORES_SERIE, CORES_STATUS, corDaSerie } from '../../utils/paleta.js';

const TOP_MUNICIPIOS = 10;
const TAMANHO_AMOSTRA = 200;
const numero = (v) => (v == null ? null : Number(v).toLocaleString('pt-BR'));

function formatarMes(mes) {
  const [ano, n] = String(mes).split('-');
  return ano && n ? `${n}/${ano}` : String(mes);
}

/** Demandas por equipe: agrupa a listagem (a API ainda não tem indicador por equipe). */
async function carregarPorEquipe() {
  const pagina = await listarDemandas({ size: TAMANHO_AMOSTRA });
  const conteudo = pagina.content ?? [];
  const contagem = new Map();
  for (const d of conteudo) {
    const nome = d.equipe?.nome ?? 'Sem equipe';
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  return {
    itens: [...contagem]
      .map(([rotulo, total]) => ({ rotulo, total }))
      .sort((a, b) => b.total - a.total),
    parcial: (pagina.totalElements ?? 0) > conteudo.length,
  };
}

function Painel({ titulo, subtitulo, colunas, estado, itens, children }) {
  const { loading, error, recarregar } = estado;
  return (
    <div className={colunas}>
      <ChartCard
        title={titulo}
        subtitle={subtitulo}
        actions={<DemoSeal />}
        loading={loading}
        error={error ? { message: mensagemDeErro(error) } : null}
        onRetry={recarregar}
        empty={itens.length === 0}
      >
        {children(itens)}
      </ChartCard>
    </div>
  );
}

/** Painel de fiscalização do Flux (`/flux/painel`). */
export default function PainelFiscalizacaoPage() {
  const resumo = useIndicador(obterResumo);
  const situacao = useIndicador(obterPorSituacao);
  const municipio = useIndicador(obterPorMunicipio);
  const categoria = useIndicador(obterPorCategoria);
  const serie = useIndicador(obterSerieMensal);
  const equipe = useIndicador(carregarPorEquipe);

  const r = resumo.data;
  const contadores = [
    ['Total', r?.totalDemandas, 'green', 'Todas as demandas recebidas.'],
    ['Pendentes', r?.pendentes, 'amber', 'Aguardam triagem (situação Pendente).'],
    ['Em andamento', r?.emAndamento, 'blue', 'Fiscalização em curso (situação Em andamento).'],
    ['Finalizadas', r?.finalizadas, 'green', 'Demandas concluídas.'],
    ['Atrasadas', r?.atrasadas, 'red', 'Demandas não finalizadas cujo prazo já venceu.'],
  ];
  const itensSituacao = situacao.data?.itens ?? [];

  return (
    <>
      <PageHeader
        module="Flux"
        title="Painel de fiscalização"
        description="Acompanhamento das demandas por status, município, categoria, equipe e período, com dados simulados."
        actions={<DemoSeal />}
      />

      {resumo.error && (
        <div className="alert alert-danger" role="alert">
          {mensagemDeErro(resumo.error)}{' '}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={resumo.recarregar}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section aria-label="Contadores por status" className="row g-3 mb-3">
        {contadores.map(([label, valor, variant, tooltip]) => (
          <div key={label} className="col-6 col-md-4 col-xl">
            <KpiCard
              label={label}
              value={numero(valor)}
              variant={variant}
              tooltip={tooltip}
              loading={resumo.loading}
            />
          </div>
        ))}
      </section>

      <div className="row g-3">
        <Painel
          titulo="Por situação"
          subtitulo="Os 7 status do fluxo"
          colunas="col-12 col-xl-4"
          estado={situacao}
          itens={itensSituacao.some((i) => i.total) ? itensSituacao : []}
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

        <Painel
          titulo="Por período"
          subtitulo="Cadastradas e finalizadas por mês"
          colunas="col-12 col-xl-8"
          estado={serie}
          itens={serie.data?.itens ?? []}
        >
          {(itens) => (
            <IndicatorChart
              tipo="line"
              ariaLabel="Demandas por período"
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

        <Painel
          titulo="Por município"
          subtitulo={`Top ${TOP_MUNICIPIOS} municípios`}
          colunas="col-12 col-xl-6"
          estado={municipio}
          itens={municipio.data?.itens ?? []}
        >
          {(itens) => {
            const top = itens.slice(0, TOP_MUNICIPIOS);
            return (
              <IndicatorChart
                horizontal
                ariaLabel="Demandas por município"
                labels={top.map((i) => i.municipio)}
                datasets={[
                  { label: 'Demandas', data: top.map((i) => i.total), color: CORES_SERIE[0] },
                ]}
              />
            );
          }}
        </Painel>

        <Painel
          titulo="Por categoria"
          subtitulo="Categoria ambiental"
          colunas="col-12 col-md-6 col-xl-3"
          estado={categoria}
          itens={categoria.data?.itens ?? []}
        >
          {(itens) => (
            <IndicatorChart
              horizontal
              ariaLabel="Demandas por categoria"
              labels={itens.map((i) => i.rotulo)}
              datasets={[
                { label: 'Demandas', data: itens.map((i) => i.total), color: CORES_SERIE[2] },
              ]}
            />
          )}
        </Painel>

        <Painel
          titulo="Por equipe"
          subtitulo={
            equipe.data?.parcial
              ? `Primeiras ${TAMANHO_AMOSTRA} demandas da listagem`
              : 'Demandas por equipe responsável'
          }
          colunas="col-12 col-md-6 col-xl-3"
          estado={equipe}
          itens={equipe.data?.itens ?? []}
        >
          {(itens) => (
            <IndicatorChart
              horizontal
              ariaLabel="Demandas por equipe"
              labels={itens.map((i) => i.rotulo)}
              datasets={[
                { label: 'Demandas', data: itens.map((i) => i.total), color: CORES_SERIE[1] },
              ]}
            />
          )}
        </Painel>
      </div>
    </>
  );
}
