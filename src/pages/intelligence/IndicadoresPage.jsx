import { mensagemDeErro } from '../../api/httpClient.js';
import {
  obterPorCategoria,
  obterPorMunicipio,
  obterResumo,
  obterSerieMensal,
} from '../../api/intelligenceApi.js';
import ChartCard from '../../components/ChartCard.jsx';
import DemoSeal from '../../components/DemoSeal.jsx';
import IndicatorChart from '../../components/IndicatorChart.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useIndicador from '../../hooks/useIndicador.js';
import { CORES_SERIE } from '../../utils/paleta.js';

const TOP_MUNICIPIOS = 10;
const numero = (v) => (v == null ? null : Number(v).toLocaleString('pt-BR'));

function formatarMes(mes) {
  const [ano, n] = String(mes).split('-');
  return ano && n ? `${n}/${ano}` : String(mes);
}

/** Explicação de um indicador: descrição e fórmula ("Como é calculado"). */
function Explicacao({ descricao, formula }) {
  return (
    <>
      <p className="small text-body-secondary mb-1">{descricao}</p>
      <p className="small mb-0">
        <strong>Como é calculado:</strong> {formula}
      </p>
    </>
  );
}

/** Indicador numérico com explicação. */
function IndicadorNumerico({ titulo, valor, loading, variant, descricao, formula, nota }) {
  return (
    <div className="col-12 col-md-6 col-xl-4">
      <section className="card h-100 shadow-sm" aria-label={titulo}>
        <div className="card-body d-flex flex-column gap-2">
          <KpiCard label={titulo} value={valor} loading={loading} variant={variant} />
          <Explicacao descricao={descricao} formula={formula} />
          {nota && <p className="small text-warning-emphasis mb-0">{nota}</p>}
        </div>
      </section>
    </div>
  );
}

/** Indicador gráfico: ChartCard + explicação logo abaixo. */
function IndicadorGrafico({ titulo, indicador, descricao, formula, colunas, children }) {
  const { data, loading, error, recarregar } = indicador;
  const itens = data?.itens ?? [];
  return (
    <div className={colunas}>
      <ChartCard
        title={titulo}
        actions={<DemoSeal />}
        loading={loading}
        error={error ? { message: mensagemDeErro(error) } : null}
        onRetry={recarregar}
        empty={itens.length === 0}
      >
        {children(itens)}
        <div className="mt-3 border-top pt-2">
          <Explicacao descricao={descricao} formula={formula} />
        </div>
      </ChartCard>
    </div>
  );
}

function formatarPercentual(r) {
  if (!r) return null;
  if (!r.totalDemandas) return '0%';
  const valor = (r.finalizadas / r.totalDemandas) * 100;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

/** Indicadores explicados (`/intelligence/indicadores`). */
export default function IndicadoresPage() {
  const resumo = useIndicador(obterResumo);
  const serie = useIndicador(obterSerieMensal);
  const municipio = useIndicador(obterPorMunicipio);
  const categoria = useIndicador(obterPorCategoria);
  const r = resumo.data;

  return (
    <>
      <PageHeader
        module="Intelligence"
        title="Indicadores explicados"
        description="Cada indicador mostra o que significa e como é calculado. Todos os valores vêm de dados simulados."
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

      <div className="row g-3">
        <IndicadorNumerico
          titulo="Demandas recebidas"
          valor={numero(r?.totalDemandas)}
          loading={resumo.loading}
          descricao="Quantidade de demandas de fiscalização recebidas, em qualquer situação."
          formula="contagem de todas as demandas cadastradas. A evolução por período está no gráfico mensal abaixo."
        />
        <IndicadorNumerico
          titulo="Tempo médio de atendimento (simulado)"
          valor="—"
          variant="amber"
          descricao="Tempo médio entre o recebimento e a conclusão de uma demanda."
          formula="média, em dias, de (data de conclusão − data de recebimento) das demandas finalizadas."
          nota="Indisponível: a API ainda não expõe este indicador (pendência de contrato)."
        />
        <IndicadorNumerico
          titulo="Percentual de conclusão"
          valor={formatarPercentual(r)}
          loading={resumo.loading}
          variant="blue"
          descricao="Proporção das demandas recebidas que já foram finalizadas."
          formula="demandas finalizadas ÷ demandas recebidas × 100."
        />
      </div>

      <div className="row g-3 mt-0">
        <IndicadorGrafico
          colunas="col-12 col-xl-8"
          titulo="Evolução por período"
          indicador={serie}
          descricao="Demandas cadastradas e finalizadas em cada mês."
          formula="para cada mês (AAAA-MM), conta as demandas pela data de recebimento (cadastradas) e pela data de conclusão (finalizadas)."
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
        </IndicadorGrafico>

        <IndicadorGrafico
          colunas="col-12 col-xl-4"
          titulo="Volume por categoria"
          indicador={categoria}
          descricao="Quantas demandas pertencem a cada categoria ambiental."
          formula="contagem de demandas agrupadas pela categoria atribuída na triagem."
        >
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
        </IndicadorGrafico>

        <IndicadorGrafico
          colunas="col-12"
          titulo="Distribuição territorial"
          indicador={municipio}
          descricao="Municípios de Mato Grosso com mais demandas."
          formula={`contagem de demandas agrupadas pelo município de origem; exibe os ${TOP_MUNICIPIOS} maiores.`}
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
        </IndicadorGrafico>
      </div>
    </>
  );
}
