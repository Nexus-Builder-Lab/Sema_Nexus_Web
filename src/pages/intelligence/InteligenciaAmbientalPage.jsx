import { useEffect, useState } from 'react';
import { listarBiomas, listarCategorias, listarMunicipios } from '../../api/catalogosApi.js';
import { obterMapa } from '../../api/intelligenceApi.js';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import MapFilters from './MapFilters.jsx';
import MapLegend from './MapLegend.jsx';
import MapaMT from './MapaMT.jsx';
import { FILTROS_VAZIOS } from './mapaConfig.js';

const CATALOGOS_VAZIOS = { municipios: [], biomas: [], categorias: [] };

export default function InteligenciaAmbientalPage() {
  const [catalogos, setCatalogos] = useState(CATALOGOS_VAZIOS);
  const [rascunho, setRascunho] = useState(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VAZIOS);
  const [resposta, setResposta] = useState({ chave: null, erro: null, pontos: [] });
  const [tentativa, setTentativa] = useState(0);

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
  const chave = `${tentativa}|${JSON.stringify(aplicados)}`;
  useEffect(() => {
    let ativo = true;
    obterMapa(aplicados)
      .then((dados) => ativo && setResposta({ chave, erro: null, pontos: dados.pontos ?? [] }))
      .catch((erro) => ativo && setResposta({ chave, erro, pontos: [] }));
    return () => {
      ativo = false;
    };
  }, [aplicados, chave]);

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
              <MapaMT pontos={pontos} />
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
        </div>
        <div className="col-12 col-xl-3">
          <MapLegend />
        </div>
      </div>
    </>
  );
}
