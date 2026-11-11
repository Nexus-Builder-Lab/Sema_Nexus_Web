import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { detalharDemanda, iniciarTriagem, listarHistorico } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { acoesDisponiveis, podeEditarDemandas, STATUS_EDITAVEIS } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Timeline from '../../components/Timeline.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { formatarData } from '../../utils/datas.js';
import { carregarCatalogosFlux, rotuloDoCatalogo } from './catalogosFlux.js';
import DistribuicaoModal from './DistribuicaoModal.jsx';
import TriagemModal from './TriagemModal.jsx';

function Dado({ rotulo, children }) {
  return (
    <div className="col-12 col-md-6 col-xl-4">
      <dt className="text-body-secondary small fw-normal">{rotulo}</dt>
      <dd className="mb-0">{children || '—'}</dd>
    </div>
  );
}

/** Detalhes da demanda (`/flux/demandas/:id`): dados, linha do tempo e ações de triagem/distribuição. */
export default function DemandaDetailPage() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [acaoAberta, setAcaoAberta] = useState(null);
  const [executando, setExecutando] = useState(false);

  const catalogos = useCarregar(carregarCatalogosFlux);
  const demanda = useCarregar(useCallback(() => detalharDemanda(id), [id]));
  const historico = useCarregar(useCallback(() => listarHistorico(id), [id]));

  function aposAcao(mensagem) {
    setAcaoAberta(null);
    showToast({ message: mensagem });
    demanda.recarregar();
    historico.recarregar();
  }

  async function confirmarInicioTriagem() {
    setExecutando(true);
    try {
      await iniciarTriagem(id);
      aposAcao('Triagem iniciada com sucesso.');
    } catch (erro) {
      setAcaoAberta(null);
      showToast({
        variant: 'danger',
        message:
          erro.response?.status === 403
            ? 'Seu perfil não tem permissão para esta operação.'
            : mensagemDeErro(erro, 'Não foi possível iniciar a triagem.'),
      });
    } finally {
      setExecutando(false);
    }
  }

  const erro = demanda.error || catalogos.error;
  if (erro) {
    return (
      <>
        <PageHeader module="Flux" title="Detalhes da demanda" />
        <ErrorState
          title={
            demanda.error?.response?.status === 404
              ? 'Demanda não encontrada'
              : 'Não foi possível carregar a demanda'
          }
          message={mensagemDeErro(erro)}
          onRetry={() => {
            demanda.recarregar();
            catalogos.recarregar();
          }}
        />
        <Link to="/flux/demandas" className="btn btn-outline-secondary mt-3">
          Voltar para demandas
        </Link>
      </>
    );
  }
  if (!demanda.data || !catalogos.data) {
    return (
      <>
        <PageHeader module="Flux" title="Detalhes da demanda" />
        <Loading message="Carregando demanda..." />
      </>
    );
  }

  const d = demanda.data;
  const cat = catalogos.data;
  const acoes = acoesDisponiveis(d.status, usuario);
  const editavel = STATUS_EDITAVEIS.includes(d.status) && podeEditarDemandas(usuario);

  const botoes = (
    <>
      <Link to="/flux/demandas" className="btn btn-outline-secondary">
        Voltar
      </Link>
      {editavel && (
        <Link to={`/flux/demandas/${d.id}/editar`} className="btn btn-outline-primary">
          Editar
        </Link>
      )}
      {acoes.includes('INICIAR_TRIAGEM') && (
        <button type="button" className="btn btn-primary" onClick={() => setAcaoAberta('INICIAR')}>
          Iniciar triagem
        </button>
      )}
      {acoes.includes('CONCLUIR_TRIAGEM') && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setAcaoAberta('CLASSIFICAR')}
        >
          Concluir triagem
        </button>
      )}
      {acoes.includes('SOLICITAR_COMPLEMENTACAO') && (
        <button
          type="button"
          className="btn btn-outline-warning"
          onClick={() => setAcaoAberta('SOLICITAR_COMPLEMENTACAO')}
        >
          Solicitar complementação
        </button>
      )}
      {acoes.includes('DISTRIBUIR') && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setAcaoAberta('DISTRIBUIR')}
        >
          Distribuir
        </button>
      )}
    </>
  );

  return (
    <>
      <PageHeader module="Flux" title={`${d.numero} — ${d.titulo}`} actions={botoes} />

      <section className="card card-body shadow-sm mb-3" aria-labelledby="dados-demanda">
        <h2 id="dados-demanda" className="h5 mb-3">
          Dados da demanda
        </h2>
        <dl className="row g-3 mb-0">
          <Dado rotulo="Situação">
            <StatusBadge status={d.status} />
            {d.atrasada && <span className="nx-badge nx-badge-red ms-2">Atrasada</span>}
          </Dado>
          <Dado rotulo="Prioridade">
            {d.prioridade && <PriorityBadge prioridade={d.prioridade} />}
          </Dado>
          <Dado rotulo="Prazo">{d.prazo && formatarData(d.prazo)}</Dado>
          <Dado rotulo="Equipe">{d.equipe?.nome}</Dado>
          <Dado rotulo="Fiscal">{d.fiscal?.nome}</Dado>
          <Dado rotulo="Origem">{rotuloDoCatalogo(cat.origens, d.origem)}</Dado>
          <Dado rotulo="Categoria">
            {d.categoria && rotuloDoCatalogo(cat.categorias, d.categoria)}
          </Dado>
          <Dado rotulo="Município">{d.municipio?.nome}</Dado>
          <Dado rotulo="Localidade">{d.localidade}</Dado>
          <Dado rotulo="Data de recebimento">{formatarData(d.dataRecebimento)}</Dado>
          <div className="col-12">
            <dt className="text-body-secondary small fw-normal">Descrição</dt>
            <dd className="mb-0">{d.descricao}</dd>
          </div>
          <div className="col-12">
            <dt className="text-body-secondary small fw-normal">Observações</dt>
            <dd className="mb-0">{d.observacoes || '—'}</dd>
          </div>
        </dl>
      </section>

      <div className="row g-3">
        <section className="col-12 col-lg-5" aria-labelledby="docs-demanda">
          <div className="card card-body shadow-sm h-100">
            <h2 id="docs-demanda" className="h5 mb-3">
              Documentos
            </h2>
            <p className="text-body-secondary mb-0">
              {d.totalDocumentos > 0
                ? `${d.totalDocumentos} documento(s) associado(s). A listagem será exibida em breve.`
                : 'Nenhum documento associado.'}
            </p>
          </div>
        </section>
        <section className="col-12 col-lg-7" aria-labelledby="hist-demanda">
          <div className="card card-body shadow-sm h-100">
            <h2 id="hist-demanda" className="h5 mb-3">
              Linha do tempo
            </h2>
            {historico.error ? (
              <ErrorState
                title="Não foi possível carregar o histórico"
                message={mensagemDeErro(historico.error)}
                onRetry={historico.recarregar}
              />
            ) : historico.data ? (
              <Timeline itens={historico.data} />
            ) : (
              <Loading message="Carregando histórico..." />
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        show={acaoAberta === 'INICIAR'}
        title="Iniciar triagem"
        message={`Iniciar a triagem da demanda ${d.numero}? O status passará para Em triagem.`}
        confirmLabel="Iniciar triagem"
        variant="primary"
        busy={executando}
        onConfirm={confirmarInicioTriagem}
        onCancel={() => setAcaoAberta(null)}
      />
      {(acaoAberta === 'CLASSIFICAR' || acaoAberta === 'SOLICITAR_COMPLEMENTACAO') && (
        <TriagemModal
          demanda={d}
          decisao={acaoAberta}
          catalogos={cat}
          onClose={() => setAcaoAberta(null)}
          onSucesso={aposAcao}
        />
      )}
      {acaoAberta === 'DISTRIBUIR' && (
        <DistribuicaoModal demanda={d} onClose={() => setAcaoAberta(null)} onSucesso={aposAcao} />
      )}
    </>
  );
}
