import { mensagemDeErro } from '../../api/httpClient.js';
import {
  obterPorBioma,
  obterPorCategoria,
  obterResumo,
  obterSerieMensal,
} from '../../api/intelligenceApi.js';
import ChartCard from '../../components/ChartCard.jsx';
import IndicatorChart from '../../components/IndicatorChart.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import useIndicador from '../../hooks/useIndicador.js';
import { CORES_BIOMA, CORES_SERIE } from '../../utils/paleta.js';
import { rotuloDoBioma } from './mapaConfig.js';

const numero = (v) => (v == null ? null : Number(v).toLocaleString('pt-BR'));

function formatarMes(mes) {
  const [ano, n] = String(mes).split('-');
  return ano && n ? `${n}/${ano}` : String(mes);
}

/** Seis cartões KPI do painel (`/intelligence/resumo`, com os filtros aplicados). */
export function KpisPainel({ filtros }) {
  const { data: r, loading, error, recarregar } = useIndicador(obterResumo, filtros);
  const kpis = [
    ['Demandas', r?.totalDemandas, 'green', 'clipboard'],
    ['Pendentes', r?.pendentes, 'amber', 'inbox'],
    ['Em andamento', r?.emAndamento, 'blue', 'layers'],
    ['Finalizadas', r?.finalizadas, 'green', 'report'],
    ['Atrasadas', r?.atrasadas, 'red', 'alert'],
    ['Documentos', r?.totalDocumentos, 'blue', 'folder'],
  ];
  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert">
          {mensagemDeErro(error)}{' '}
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={recarregar}>
            Tentar novamente
          </button>
        </div>
      )}
      <div className="row g-3 mb-3" aria-label="Indicadores do painel">
        {kpis.map(([label, valor, variant, icon]) => (
          <div key={label} className="col-6 col-md-4 col-xl-2">
            <KpiCard
              label={label}
              value={numero(valor)}
              variant={variant}
              icon={icon}
              loading={loading}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function Grafico({ titulo, indicador, colunas, children }) {
  const { data, loading, error, recarregar } = indicador;
  const itens = data?.itens ?? [];
  return (
    <div className={colunas}>
      <ChartCard
        title={titulo}
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

/** Evolução temporal, distribuição por categoria e por bioma; a tabela por município fica em outro componente. */
export function GraficosPainel({ filtros }) {
  const serie = useIndicador(obterSerieMensal, filtros);
  const categoria = useIndicador(obterPorCategoria, filtros);
  const bioma = useIndicador(obterPorBioma, filtros);
  return (
    <div className="row g-3 mt-0 mb-3">
      <Grafico titulo="Evolução temporal" indicador={serie} colunas="col-12 col-xl-6">
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
      </Grafico>
      <Grafico
        titulo="Distribuição por categoria"
        indicador={categoria}
        colunas="col-12 col-md-6 col-xl-3"
      >
        {(itens) => (
          <IndicatorChart
            tipo="doughnut"
            ariaLabel="Demandas por categoria ambiental"
            labels={itens.map((i) => i.rotulo)}
            datasets={[
              {
                label: 'Demandas',
                data: itens.map((i) => i.total),
                colors: itens.map((_, i) => CORES_SERIE[i % CORES_SERIE.length]),
              },
            ]}
          />
        )}
      </Grafico>
      <Grafico titulo="Distribuição por bioma" indicador={bioma} colunas="col-12 col-md-6 col-xl-3">
        {(itens) => (
          <IndicatorChart
            ariaLabel="Demandas por bioma"
            labels={itens.map((i) => i.rotulo ?? rotuloDoBioma(i.codigo))}
            datasets={[
              {
                label: 'Demandas',
                data: itens.map((i) => i.total),
                colors: itens.map((i) => CORES_BIOMA[i.codigo] ?? CORES_SERIE[7]),
              },
            ]}
          />
        )}
      </Grafico>
    </div>
  );
}

/** Tabela "Indicadores por município". */
export function TabelaMunicipios({ itens, municipios, carregando, erro, onRetry }) {
  const regiao = new Map(municipios.map((m) => [Number(m.id), m.regiao]));
  return (
    <ChartCard
      title="Indicadores por município"
      loading={carregando}
      error={erro ? { message: mensagemDeErro(erro) } : null}
      onRetry={onRetry}
      empty={itens.length === 0}
    >
      <div className="table-responsive nx-table-scroll">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Município</th>
              <th scope="col">Região</th>
              <th scope="col">Bioma</th>
              <th scope="col" className="text-end">
                Demandas
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.map((m) => (
              <tr key={m.municipioId}>
                <th scope="row" className="fw-semibold">
                  {m.municipio}
                </th>
                <td>{regiao.get(Number(m.municipioId)) ?? '—'}</td>
                <td>{rotuloDoBioma(m.bioma)}</td>
                <td className="text-end">{m.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
