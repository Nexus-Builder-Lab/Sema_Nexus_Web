import { Link } from 'react-router-dom';
import { podeEditarDemandas } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import { ROTULOS_STATUS, rotuloDaCategoria, rotuloDoBioma } from './mapaConfig.js';
import { formatarData, formatarDataHora } from './satelliteFormat.js';
import {
  ROTULOS_ATRIBUTOS,
  TIPOS_SELECAO,
  destinoDemandaMonitoramento,
  formatarHectares,
  formatarKm2,
  formatarValor,
} from './selecaoMapa.js';

const AVISO_FICTICIO = 'AMBIENTE DEMONSTRATIVO — DADOS FICTÍCIOS';

function Linha({ rotulo, children }) {
  return (
    <>
      <dt className="col-5 text-body-secondary fw-normal">{rotulo}</dt>
      <dd className="col-7 mb-1 text-break">{children ?? '—'}</dd>
    </>
  );
}

const coordenadas = (lat, lon) =>
  lat == null || lon == null
    ? null
    : `${Number(lat).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}, ${Number(lon).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}`;

function AreaInpe({ dados }) {
  const ha = formatarHectares(dados.ponto?.areaHa);
  if (dados.areaInformada && ha) {
    return (
      <>
        <strong>{ha}</strong>
        <div className="small text-body-secondary">
          Fonte: {formatarKm2(dados.areaKm2Fonte ?? dados.ponto?.areaKm2)} (campo{' '}
          <code>{dados.areaCampoFonte}</code> do INPE/TerraBrasilis; 1 km² = 100 ha). Polígono
          destacado no mapa.
        </div>
      </>
    );
  }
  return <span>{dados.areaObservacao || 'Área afetada: não informada pela fonte.'}</span>;
}

function DetalheInpe({ dados, podeCriarDemanda }) {
  const p = dados.ponto ?? {};
  const atributos = Object.entries(dados.atributos ?? {});
  const imp = dados.importacao;
  const destino = podeCriarDemanda ? destinoDemandaMonitoramento(dados) : null;
  return (
    <>
      <dl className="row small mb-2">
        <Linha rotulo="Tipo">{TIPOS_SELECAO[p.tipo] ?? p.tipo}</Linha>
        <Linha rotulo="Data/hora (UTC)">{formatarDataHora(p.dataHora)}</Linha>
        <Linha rotulo="Satélite">{p.satelite}</Linha>
        {p.classe && <Linha rotulo="Classe">{p.classe}</Linha>}
        <Linha rotulo="Município">{p.municipio}</Linha>
        <Linha rotulo="Bioma">{rotuloDoBioma(p.bioma)}</Linha>
        <Linha rotulo={p.tipo === 'DESMATAMENTO' ? 'Centro aproximado' : 'Coordenadas'}>
          {coordenadas(p.latitude, p.longitude)}
        </Linha>
        <Linha rotulo="Área afetada">
          <AreaInpe dados={dados} />
        </Linha>
      </dl>
      {atributos.length > 0 && (
        <>
          <h3 className="h6 mt-2">Atributos da fonte</h3>
          <dl className="row small mb-2" aria-label="Atributos da fonte">
            {atributos.map(([nome, valor]) => (
              <Linha key={nome} rotulo={ROTULOS_ATRIBUTOS[nome] ?? nome}>
                {formatarValor(valor)}
              </Linha>
            ))}
          </dl>
        </>
      )}
      <p className="small text-body-secondary mb-0">
        Fonte: {imp?.fonte ?? dados.fonte} — dados públicos reais, não oficiais da SEMA.
        {imp && (
          <>
            {' '}
            Período do snapshot {formatarData(imp.periodoDe)} a {formatarData(imp.periodoAte)};
            importado em {formatarData(imp.importadoEm)}. Licença: {imp.licenca}
          </>
        )}
      </p>
      {destino && (
        <div className="mt-3">
          <Link to={destino.to} state={destino.state} className="btn btn-primary btn-sm w-100">
            Criar Demanda de Monitoramento
          </Link>
        </div>
      )}
    </>
  );
}

function DetalheDemanda({ dados }) {
  const ha = formatarHectares(dados.areaHa);
  return (
    <>
      <dl className="row small mb-2">
        <Linha rotulo="Número">{dados.numero}</Linha>
        <Linha rotulo="Título">{dados.titulo}</Linha>
        <Linha rotulo="Status">{ROTULOS_STATUS[dados.status] ?? dados.status}</Linha>
        <Linha rotulo="Categoria">{rotuloDaCategoria(dados.categoria)}</Linha>
        <Linha rotulo="Prioridade">{dados.prioridade}</Linha>
        <Linha rotulo="Origem">{dados.origem}</Linha>
        <Linha rotulo="Município">{dados.municipio?.nome}</Linha>
        <Linha rotulo="Bioma">{rotuloDoBioma(dados.municipio?.bioma)}</Linha>
        <Linha rotulo="Localidade">{dados.localidade}</Linha>
        <Linha rotulo="Coordenadas">
          {coordenadas(dados.latitude, dados.longitude) ??
            'Sem coordenada própria (centroide do município)'}
        </Linha>
        <Linha rotulo="Área afetada">
          {ha ? (
            <>
              <strong>{ha}</strong>
              <div className="small text-body-secondary">
                Polígono fictício (massa demonstrativa), destacado no mapa.
              </div>
            </>
          ) : (
            'Não informada para esta demanda.'
          )}
        </Linha>
        <Linha rotulo="Recebida em">{formatarData(dados.dataRecebimento)}</Linha>
        <Linha rotulo="Prazo sugerido">{formatarData(dados.prazoSugerido)}</Linha>
        <Linha rotulo="Prazo">
          {formatarData(dados.prazo)}
          {dados.atrasada ? ' (atrasada)' : ''}
        </Linha>
        <Linha rotulo="Equipe">{dados.equipe?.nome}</Linha>
        <Linha rotulo="Fiscal">{dados.fiscal?.nome}</Linha>
        <Linha rotulo="Descrição">{dados.descricao}</Linha>
        {dados.observacoes && <Linha rotulo="Observações">{dados.observacoes}</Linha>}
        {dados.fiscalizacao && (
          <Linha rotulo="Fiscalização">
            {formatarData(dados.fiscalizacao.data)} — {dados.fiscalizacao.resultado}
          </Linha>
        )}
        {dados.resultadoFinal && <Linha rotulo="Resultado final">{dados.resultadoFinal}</Linha>}
        {dados.justificativaConclusao && (
          <Linha rotulo="Justificativa">{dados.justificativaConclusao}</Linha>
        )}
        {dados.concluidaEm && (
          <Linha rotulo="Concluída em">{formatarData(dados.concluidaEm)}</Linha>
        )}
        <Linha rotulo="Documentos">{String(dados.totalDocumentos ?? 0)}</Linha>
        <Linha rotulo="Cadastrada por">{dados.criadoPor?.nome}</Linha>
        <Linha rotulo="Cadastrada em">{formatarData(dados.criadoEm)}</Linha>
        {dados.atualizadoEm && (
          <Linha rotulo="Atualizada em">{formatarData(dados.atualizadoEm)}</Linha>
        )}
      </dl>
      <Link to={`/flux/demandas/${dados.id}`} className="small">
        Ver a demanda completa no Flux
      </Link>
    </>
  );
}

/**
 * Painel "Detalhes da seleção": tudo o que a API tem sobre o item clicado no mapa. INPE sempre identificado como
 * dado público real; demanda sempre como fictícia. A permissão é da API (403 → aviso, sem dados).
 */
export default function DetalheSelecaoPainel({ selecao, estado, onFechar, onTentarDeNovo }) {
  const { usuario } = useAuth();
  if (!selecao) return null;
  const inpe = selecao.tipo !== 'DEMANDA';
  const negado = estado.erro?.response?.status === 403;
  const podeCriarDemanda = podeEditarDemandas(usuario);
  return (
    <section
      className={`card shadow-sm mb-3 ${inpe ? 'border-warning' : 'border-primary'}`}
      aria-label="Detalhes da seleção no mapa"
    >
      <div
        className={`card-header d-flex justify-content-between align-items-start gap-2 ${inpe ? 'bg-warning-subtle' : 'bg-primary-subtle'}`}
      >
        <div>
          <h2 className="h6 mb-1">{TIPOS_SELECAO[selecao.tipo]}</h2>
          {inpe ? (
            <span className="badge text-bg-warning">INPE — dados públicos reais</span>
          ) : (
            <span className="badge text-bg-secondary">{AVISO_FICTICIO}</span>
          )}
        </div>
        <button
          type="button"
          className="btn-close"
          aria-label="Fechar detalhes da seleção"
          onClick={onFechar}
        />
      </div>
      <div className="card-body">
        {estado.carregando ? (
          <Loading message="Carregando detalhes..." />
        ) : negado ? (
          <p className="small mb-0" role="alert">
            Seu perfil não tem acesso aos detalhes desta demanda
            {selecao.resumo?.numero ? ` (${selecao.resumo.numero})` : ''}.
          </p>
        ) : estado.erro ? (
          <ErrorState
            message={estado.erro.message || 'Falha ao obter os detalhes.'}
            onRetry={onTentarDeNovo}
            className="mb-0"
          />
        ) : estado.dados ? (
          inpe ? (
            <DetalheInpe dados={estado.dados} podeCriarDemanda={podeCriarDemanda} />
          ) : (
            <DetalheDemanda dados={estado.dados} />
          )
        ) : null}
      </div>
    </section>
  );
}
