import { useEffect, useMemo, useRef, useState } from 'react';
import {
  listarBiomas,
  listarCategorias,
  listarMunicipios,
  listarStatus,
} from '../../api/catalogosApi.js';
import { obterMapa, obterPorMunicipio } from '../../api/intelligenceApi.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import useIndicador from '../../hooks/useIndicador.js';
import ConcentracaoLegenda from './ConcentracaoLegenda.jsx';
import { gerarCsv, intervaloDoPeriodo, PERIODOS } from './concentracao.js';
import MapFilters from './MapFilters.jsx';
import MapLegend from './MapLegend.jsx';
import MapaMT from './MapaMT.jsx';
import { GraficosPainel, KpisPainel, TabelaMunicipios } from './PainelIndicadores.jsx';
import RankingMunicipios from './RankingMunicipios.jsx';
import SatelliteLayer from './SatelliteLayer.jsx';
import SatelliteLegend from './SatelliteLegend.jsx';
import SatelliteSidePanel from './SatelliteSidePanel.jsx';
import useReferenciaSatelite from './useReferenciaSatelite.js';
import { FILTROS_VAZIOS } from './mapaConfig.js';

const CATALOGOS_VAZIOS = { municipios: [], biomas: [], categorias: [], situacoes: [] };

function baixarCsv(itens) {
  const blob = new Blob(['\uFEFF', gerarCsv(itens)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'indicadores-por-municipio.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function InteligenciaAmbientalPage() {
  const [catalogos, setCatalogos] = useState(CATALOGOS_VAZIOS);
  const [rascunho, setRascunho] = useState(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VAZIOS);
  const [resposta, setResposta] = useState({ chave: null, erro: null, pontos: [] });
  const [tentativa, setTentativa] = useState(0);
  const [ligadas, setLigadas] = useState({ FOCO_CALOR: false, DESMATAMENTO: false });
  const [agregadoManual, setAgregadoManual] = useState(false);
  const [tentativaSat, setTentativaSat] = useState(0);
  const [modo, setModo] = useState('pontos');
  const [fundoOnline, setFundoOnline] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const cartaoMapa = useRef(null);

  // Catálogos dos filtros: se falharem, o mapa ainda funciona (filtros ficam só com "Todos").
  useEffect(() => {
    let ativo = true;
    Promise.all([listarMunicipios(), listarBiomas(), listarCategorias(), listarStatus()])
      .then(([municipios, biomas, categorias, situacoes]) => {
        if (ativo) setCatalogos({ municipios, biomas, categorias, situacoes });
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  // Estado derivado: a consulta está "carregando" enquanto a resposta guardada não for a da chave atual.
  // Os filtros do satélite (satDe/satAte) não fazem parte da consulta das demandas fictícias.
  const filtrosDemanda = useMemo(() => {
    const resto = { ...aplicados };
    delete resto.satDe;
    delete resto.satAte;
    return resto;
  }, [aplicados]);
  const chave = `${tentativa}|${JSON.stringify(filtrosDemanda)}`;
  useEffect(() => {
    let ativo = true;
    obterMapa(filtrosDemanda)
      .then((dados) => ativo && setResposta({ chave, erro: null, pontos: dados.pontos ?? [] }))
      .catch((erro) => ativo && setResposta({ chave, erro, pontos: [] }));
    return () => {
      ativo = false;
    };
  }, [filtrosDemanda, chave]);

  const sat = useReferenciaSatelite(aplicados, ligadas, agregadoManual, tentativaSat);
  const aoLigar = (tipo, ligada) => setLigadas((atual) => ({ ...atual, [tipo]: ligada }));

  const porMunicipio = useIndicador(obterPorMunicipio, filtrosDemanda);
  const itensMunicipio = porMunicipio.data?.itens ?? [];

  const aplicarParcial = (parcial) => {
    setRascunho((atual) => ({ ...atual, ...parcial }));
    setAplicados((atual) => ({ ...atual, ...parcial }));
  };
  const filtrarPorMunicipio = (id) => aplicarParcial({ municipioId: String(id) });
  const periodoAtivo = PERIODOS.find((p) => {
    const i = intervaloDoPeriodo(p.id);
    return i.de === aplicados.de && i.ate === aplicados.ate;
  })?.id;

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === cartaoMapa.current);
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);
  const alternarTelaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else cartaoMapa.current?.requestFullscreen?.();
  };

  const limpar = () => {
    setRascunho(FILTROS_VAZIOS);
    setAplicados(FILTROS_VAZIOS);
  };

  const carregando = resposta.chave !== chave;
  const { erro, pontos } = resposta;

  return (
    <>
      <PageHeader
        module="SEMA Intelligence"
        title="Inteligência ambiental"
        description="Distribuição territorial das demandas de fiscalização em Mato Grosso (dados fictícios)."
        actions={
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={itensMunicipio.length === 0}
            onClick={() => baixarCsv(itensMunicipio)}
          >
            Exportar CSV
          </button>
        }
      />
      <div className="alert alert-warning py-2 small">
        Os dados de demandas exibidos são fictícios, gerados para demonstração. Municípios e biomas
        são do IBGE; a camada de satélite usa dados públicos do INPE, identificados e separados.
      </div>
      <MapFilters
        valores={rascunho}
        onChange={setRascunho}
        onSubmit={() => setAplicados(rascunho)}
        onClear={limpar}
        onPeriodo={(id) => aplicarParcial(intervaloDoPeriodo(id))}
        periodoAtivo={periodoAtivo}
        {...catalogos}
      />
      <KpisPainel filtros={filtrosDemanda} />
      <div className="row g-3">
        <div className="col-12 col-xl-9">
          <section
            ref={cartaoMapa}
            className="card shadow-sm nx-map-card"
            aria-label="Mapa de Mato Grosso"
          >
            <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h2 className="h6 mb-0 d-flex align-items-center gap-2">
                <Icon name="map" size={16} /> Mapa de Mato Grosso
              </h2>
              <div className="btn-group btn-group-sm" role="group" aria-label="Modo do mapa">
                <button
                  type="button"
                  className={`btn btn-outline-success${modo === 'pontos' ? ' active' : ''}`}
                  aria-pressed={modo === 'pontos'}
                  onClick={() => setModo('pontos')}
                >
                  Ocorrências
                </button>
                <button
                  type="button"
                  className={`btn btn-outline-success${modo === 'concentracao' ? ' active' : ''}`}
                  aria-pressed={modo === 'concentracao'}
                  onClick={() => setModo('concentracao')}
                >
                  Concentração por município
                </button>
              </div>
            </div>
            <div className="card-body p-2 position-relative">
              <div className="nx-map-tools">
                <button
                  type="button"
                  className="btn btn-light btn-sm shadow-sm"
                  aria-label={telaCheia ? 'Sair da tela cheia' : 'Mapa em tela cheia'}
                  onClick={alternarTelaCheia}
                >
                  <Icon name="expand" size={16} />
                </button>
                <button
                  type="button"
                  className={`btn btn-light btn-sm shadow-sm${fundoOnline ? ' active' : ''}`}
                  aria-label="Mapa de fundo OpenStreetMap (requer internet)"
                  aria-pressed={fundoOnline}
                  title="Mapa de fundo OpenStreetMap (requer internet)"
                  onClick={() => setFundoOnline((v) => !v)}
                >
                  <Icon name="globe" size={16} />
                </button>
              </div>
              {modo === 'concentracao' && <ConcentracaoLegenda itens={itensMunicipio} />}
              <MapaMT
                pontos={pontos}
                modo={modo}
                concentracao={itensMunicipio}
                municipios={catalogos.municipios}
                onSelecionarMunicipio={filtrarPorMunicipio}
                fundoOnline={fundoOnline}
              >
                <SatelliteLayer
                  focos={sat.focos}
                  deter={sat.deter}
                  porMunicipio={sat.resumo.itens}
                  agregado={sat.agregado}
                  temDeter={sat.temDeter}
                  fonte={sat.fonte}
                  onToggle={aoLigar}
                />
              </MapaMT>
              {carregando && (
                <div className="nx-map-overlay">
                  <Loading message="Carregando demandas no mapa..." />
                </div>
              )}
            </div>
            <div className="card-footer bg-white small" aria-live="polite">
              {erro ? (
                <ErrorState
                  message={erro.message || 'Falha ao obter os pontos do mapa.'}
                  onRetry={() => setTentativa((n) => n + 1)}
                  className="mb-0"
                />
              ) : !carregando && pontos.length === 0 ? (
                <EmptyState
                  title="Nenhuma demanda encontrada"
                  message="Ajuste os filtros para ver marcadores no mapa."
                  className="py-2"
                />
              ) : (
                <span>
                  {pontos.length} {pontos.length === 1 ? 'demanda' : 'demandas'} no mapa
                </span>
              )}
            </div>
          </section>
          <SatelliteLegend
            focos={ligadas.FOCO_CALOR}
            deter={ligadas.DESMATAMENTO}
            agregado={sat.agregado}
            atualizadoEm={sat.atualizadoEm}
          />
          {(ligadas.FOCO_CALOR || ligadas.DESMATAMENTO) && (
            <div className="mt-2 small" aria-live="polite">
              {sat.carregandoPontos && <span>Carregando camada do INPE...</span>}
              {sat.erroPontos && (
                <ErrorState
                  message={sat.erroPontos.message || 'Falha ao obter a camada do INPE.'}
                  onRetry={() => setTentativaSat((n) => n + 1)}
                  className="mb-0"
                />
              )}
              {sat.truncado && <span>Exibindo parte dos focos (limite da consulta).</span>}
              {ligadas.FOCO_CALOR && (
                <div className="form-check form-switch">
                  <input
                    id="sat-agregado"
                    type="checkbox"
                    className="form-check-input"
                    role="switch"
                    checked={sat.agregado}
                    disabled={sat.agregado && !agregadoManual}
                    onChange={(e) => setAgregadoManual(e.target.checked)}
                  />
                  <label htmlFor="sat-agregado" className="form-check-label">
                    Agregar focos por município
                    {sat.agregado && !agregadoManual ? ' (automático: muitos pontos)' : ''}
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="col-12 col-xl-3">
          <RankingMunicipios
            itens={itensMunicipio}
            municipios={catalogos.municipios}
            carregando={porMunicipio.loading}
            erro={porMunicipio.error}
            onRetry={porMunicipio.recarregar}
            onSelecionar={filtrarPorMunicipio}
          />
          <SatelliteSidePanel
            carregando={sat.resumo.carregando}
            erro={sat.resumo.erro}
            onRetry={() => setTentativaSat((n) => n + 1)}
            total={sat.resumo.total}
            itens={sat.resumo.itens}
            atualizadoEm={sat.atualizadoEm}
          />
          {modo === 'pontos' && <MapLegend />}
        </div>
      </div>
      <GraficosPainel filtros={filtrosDemanda} />
      <TabelaMunicipios
        itens={itensMunicipio}
        municipios={catalogos.municipios}
        carregando={porMunicipio.loading}
        erro={porMunicipio.error}
        onRetry={porMunicipio.recarregar}
      />
    </>
  );
}
