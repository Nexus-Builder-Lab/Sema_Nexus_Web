import { useEffect, useMemo, useState } from 'react';
import { listarBiomas, listarCategorias, listarMunicipios } from '../../api/catalogosApi.js';
import { obterMapa } from '../../api/intelligenceApi.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import MapFilters from './MapFilters.jsx';
import MapLegend from './MapLegend.jsx';
import MapaMT from './MapaMT.jsx';
import SatelliteLayer from './SatelliteLayer.jsx';
import SatelliteLegend from './SatelliteLegend.jsx';
import SatelliteSidePanel from './SatelliteSidePanel.jsx';
import useReferenciaSatelite from './useReferenciaSatelite.js';
import { FILTROS_VAZIOS } from './mapaConfig.js';

const CATALOGOS_VAZIOS = { municipios: [], biomas: [], categorias: [] };

export default function InteligenciaAmbientalPage() {
  const [catalogos, setCatalogos] = useState(CATALOGOS_VAZIOS);
  const [rascunho, setRascunho] = useState(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VAZIOS);
  const [resposta, setResposta] = useState({ chave: null, erro: null, pontos: [] });
  const [tentativa, setTentativa] = useState(0);
  const [ligadas, setLigadas] = useState({ FOCO_CALOR: false, DESMATAMENTO: false });
  const [agregadoManual, setAgregadoManual] = useState(false);
  const [tentativaSat, setTentativaSat] = useState(0);

  // Catálogos dos filtros: se falharem, o mapa ainda funciona (filtros ficam só com "Todos").
  useEffect(() => {
    let ativo = true;
    Promise.all([listarMunicipios(), listarBiomas(), listarCategorias()])
      .then(([municipios, biomas, categorias]) => {
        if (ativo) setCatalogos({ municipios, biomas, categorias });
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
      />
      <MapFilters
        valores={rascunho}
        onChange={setRascunho}
        onSubmit={() => setAplicados(rascunho)}
        onClear={limpar}
        {...catalogos}
      />
      <div className="row g-3">
        <div className="col-12 col-xl-9">
          <section className="card shadow-sm" aria-label="Mapa de Mato Grosso">
            <div className="card-body p-2 position-relative">
              <MapaMT pontos={pontos}>
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
          <SatelliteSidePanel
            carregando={sat.resumo.carregando}
            erro={sat.resumo.erro}
            onRetry={() => setTentativaSat((n) => n + 1)}
            total={sat.resumo.total}
            itens={sat.resumo.itens}
            atualizadoEm={sat.atualizadoEm}
          />
          <MapLegend />
        </div>
      </div>
    </>
  );
}
