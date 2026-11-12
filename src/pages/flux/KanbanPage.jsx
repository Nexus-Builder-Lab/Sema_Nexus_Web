import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  detalharDemanda,
  iniciarExecucao,
  iniciarTriagem,
  listarDemandas,
} from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { podeEditarDemandas } from '../../auth/perfis.js';
import { useAuth } from '../../auth/useAuth.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import Icon from '../../components/Icon.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PriorityBadge from '../../components/PriorityBadge.jsx';
import { useToast } from '../../components/Toasts.jsx';
import useCarregar from '../../hooks/useCarregar.js';
import { STATUS_DEMANDA } from '../../utils/catalogos.js';
import { diasEntre, formatarData, hojeISO } from '../../utils/datas.js';
import { carregarCatalogosFlux } from './catalogosFlux.js';
import ConclusaoModal from './ConclusaoModal.jsx';
import DistribuicaoModal from './DistribuicaoModal.jsx';
import FiscalizacaoModal from './FiscalizacaoModal.jsx';
import { acaoDaTransicao, transicoesPermitidas } from './kanbanTransicoes.js';
import TriagemModal from './TriagemModal.jsx';

const LIMITE = 100;
const PESO = { URGENTE: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 };
const ORDEM_STATUS = Object.keys(STATUS_DEMANDA);
const CONFIRMACOES = {
  INICIAR_TRIAGEM: {
    titulo: 'Iniciar triagem',
    texto: (n) => `Iniciar a triagem da demanda ${n}? O status passará para Em triagem.`,
    executar: iniciarTriagem,
    sucesso: 'Triagem iniciada.',
  },
  INICIAR_EXECUCAO: {
    titulo: 'Iniciar execução',
    texto: (n) => `Iniciar a execução da demanda ${n}? O status passará para Em andamento.`,
    executar: iniciarExecucao,
    sucesso: 'Execução iniciada.',
  },
};

const iniciais = (nome = '') =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

function antigaFinalizada(d) {
  if (d.status !== 'FINALIZADA') return false;
  const ref = (d.atualizadoEm ?? d.criadoEm ?? d.dataRecebimento ?? '').slice(0, 10);
  return Boolean(ref) && diasEntre(ref, hojeISO()) > 30;
}

function Prazo({ d }) {
  if (d.status === 'FINALIZADA') return <span className="nx-prazo-ok">Concluída</span>;
  if (!d.prazo) return <span className="text-body-secondary">Sem prazo</span>;
  const vencida = d.atrasada || diasEntre(hojeISO(), d.prazo) < 0;
  return <span className={vencida ? 'nx-prazo-venc' : ''}>{formatarData(d.prazo)}</span>;
}

/** Executa a ação escolhida ao mover o cartão: carrega o detalhe e abre o formulário/confirmação. */
function AcaoKanban({ acao, demandaId, catalogos, onClose, onSucesso }) {
  const { showToast } = useToast();
  const [executando, setExecutando] = useState(false);
  const detalhe = useCarregar(useCallback(() => detalharDemanda(demandaId), [demandaId]));
  const d = detalhe.data;
  const confirmacao = CONFIRMACOES[acao];

  const falha = detalhe.error;
  useEffect(() => {
    if (!falha) return;
    showToast({ variant: 'danger', message: mensagemDeErro(falha) });
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [falha]);

  if (falha || !d) return null;

  async function confirmar() {
    setExecutando(true);
    try {
      await confirmacao.executar(demandaId);
      onSucesso(confirmacao.sucesso);
    } catch (erro) {
      onClose();
      showToast({
        variant: 'danger',
        message:
          erro.response?.status === 403
            ? 'Seu perfil não tem permissão para esta operação.'
            : mensagemDeErro(erro, 'Não foi possível mover a demanda.'),
      });
    } finally {
      setExecutando(false);
    }
  }

  if (confirmacao) {
    return (
      <ConfirmDialog
        show
        title={confirmacao.titulo}
        message={confirmacao.texto(d.numero)}
        confirmLabel={confirmacao.titulo}
        variant="primary"
        busy={executando}
        onConfirm={confirmar}
        onCancel={onClose}
      />
    );
  }
  if (acao === 'CONCLUIR_TRIAGEM' || acao === 'SOLICITAR_COMPLEMENTACAO') {
    return (
      <TriagemModal
        demanda={d}
        decisao={acao === 'CONCLUIR_TRIAGEM' ? 'CLASSIFICAR' : 'SOLICITAR_COMPLEMENTACAO'}
        catalogos={catalogos}
        onClose={onClose}
        onSucesso={onSucesso}
      />
    );
  }
  if (acao === 'DISTRIBUIR')
    return <DistribuicaoModal demanda={d} onClose={onClose} onSucesso={onSucesso} />;
  if (acao === 'REGISTRAR_FISCALIZACAO')
    return <FiscalizacaoModal demanda={d} onClose={onClose} onSucesso={onSucesso} />;
  return <ConclusaoModal demanda={d} modo={acao} onClose={onClose} onSucesso={onSucesso} />;
}

function Cartao({ d, usuario, onDragStart, onDragEnd, onMover }) {
  const destinos = transicoesPermitidas(d, usuario);
  return (
    <div
      className={`nx-kb-card nx-kb-p-${d.prioridade ?? 'NENHUMA'}${destinos.length ? '' : ' nx-kb-locked'}`}
      draggable={destinos.length > 0}
      data-testid={`kb-card-${d.id}`}
      onDragStart={(e) => onDragStart(e, d)}
      onDragEnd={onDragEnd}
    >
      <div className="d-flex justify-content-between align-items-center gap-2">
        <Link to={`/flux/demandas/${d.id}`} className="nx-num-mono">
          {d.numero}
        </Link>
        {d.prioridade && <PriorityBadge prioridade={d.prioridade} />}
      </div>
      <div className="nx-kb-title">{d.titulo}</div>
      <div className="nx-kb-meta">
        {d.equipe && <span className="nx-kb-tag">{d.equipe.nome}</span>}
        <span>
          <Icon name="pin" size={12} /> {d.municipio?.nome}
        </span>
      </div>
      <div className="nx-kb-foot">
        <span className="small">
          <Icon name="clock" size={12} /> <Prazo d={d} />
        </span>
        {d.fiscal && (
          <span
            className="nx-avatar"
            title={d.fiscal.nome}
            role="img"
            aria-label={`Responsável ${d.fiscal.nome}`}
          >
            {iniciais(d.fiscal.nome)}
          </span>
        )}
      </div>
      {destinos.length > 0 && (
        <select
          className="form-select form-select-sm mt-2"
          aria-label={`Mover ${d.numero} para`}
          value=""
          onChange={(e) => e.target.value && onMover(d, e.target.value)}
        >
          <option value="">Mover para...</option>
          {destinos.map((t) => (
            <option key={t.para} value={t.para}>
              {`→ ${STATUS_DEMANDA[t.para].label}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Fluxo de atividades (`/flux/kanban`): quadro por status; só move por transições válidas. */
export default function KanbanPage() {
  const { usuario } = useAuth();
  const { showToast } = useToast();
  const [filtros, setFiltros] = useState({ q: '', equipe: '', prioridade: '', ocultar: true });
  const [arrastando, setArrastando] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [acao, setAcao] = useState(null);

  const lista = useCarregar(
    useCallback(() => listarDemandas({ page: 0, size: LIMITE, sort: 'numero,desc' }), []),
  );
  const catalogos = useCarregar(carregarCatalogosFlux);

  const todas = lista.data?.content;
  const equipes = useMemo(
    () => [...new Set((todas ?? []).map((d) => d.equipe?.nome).filter(Boolean))].sort(),
    [todas],
  );
  const visiveis = useMemo(() => {
    const q = filtros.q.trim().toLowerCase();
    return (todas ?? []).filter(
      (d) =>
        (!filtros.equipe || d.equipe?.nome === filtros.equipe) &&
        (!filtros.prioridade || d.prioridade === filtros.prioridade) &&
        (!q || `${d.numero} ${d.titulo} ${d.municipio?.nome ?? ''}`.toLowerCase().includes(q)) &&
        (!filtros.ocultar || !antigaFinalizada(d)),
    );
  }, [todas, filtros]);

  function tentarMover(d, destino) {
    if (destino === d.status) return;
    const proxima = acaoDaTransicao(d, destino, usuario);
    if (!proxima) {
      showToast({
        variant: 'danger',
        message: `Movimentação não permitida: ${STATUS_DEMANDA[d.status].label} → ${STATUS_DEMANDA[destino].label}.`,
      });
      return;
    }
    setAcao({ acao: proxima, id: d.id });
  }

  function aposAcao(mensagem) {
    setAcao(null);
    showToast({ message: mensagem });
    lista.recarregar();
  }

  const definir = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));
  const erro = lista.error || catalogos.error;

  function corpo() {
    if (erro) {
      return (
        <ErrorState
          title="Não foi possível carregar o quadro"
          message={mensagemDeErro(erro)}
          onRetry={() => {
            lista.recarregar();
            catalogos.recarregar();
          }}
        />
      );
    }
    if (!todas || !catalogos.data) return <Loading message="Carregando quadro..." />;
    if (todas.length === 0) {
      return (
        <EmptyState
          title="Nenhuma demanda cadastrada"
          message="Cadastre uma demanda para vê-la no quadro."
        />
      );
    }
    return (
      <>
        {lista.data.totalElements > LIMITE && (
          <div className="alert alert-info py-2 small" role="status">
            Exibindo as {LIMITE} demandas mais recentes de {lista.data.totalElements}. Use a lista
            de demandas para ver as demais.
          </div>
        )}
        <div className="nx-kanban">
          {ORDEM_STATUS.map((status) => {
            const itens = visiveis
              .filter((d) => d.status === status)
              .sort((a, b) => (PESO[b.prioridade] ?? 0) - (PESO[a.prioridade] ?? 0));
            const valido = arrastando && acaoDaTransicao(arrastando, status, usuario);
            return (
              <section key={status} className="nx-kb-col" aria-label={STATUS_DEMANDA[status].label}>
                <div className="nx-kb-col-head">
                  <span className={`nx-kb-dot nx-kb-dot-${STATUS_DEMANDA[status].color}`} />
                  {STATUS_DEMANDA[status].label}
                  <span className="nx-kb-count">{itens.length}</span>
                </div>
                <div
                  className={`nx-kb-list${valido ? ' nx-kb-drop-ok' : ''}${sobre === status ? ' nx-kb-over' : ''}`}
                  data-testid={`kb-col-${status}`}
                  onDragOver={(e) => {
                    if (!arrastando) return;
                    e.preventDefault();
                    setSobre(status);
                  }}
                  onDragLeave={() => setSobre(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const d = arrastando;
                    setSobre(null);
                    setArrastando(null);
                    if (d) tentarMover(d, status);
                  }}
                >
                  {itens.length === 0 ? (
                    <div className="small text-body-secondary text-center p-3">Nenhuma demanda</div>
                  ) : (
                    itens.map((d) => (
                      <Cartao
                        key={d.id}
                        d={d}
                        usuario={usuario}
                        onDragStart={(e, item) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(item.id));
                          setArrastando(item);
                        }}
                        onDragEnd={() => {
                          setArrastando(null);
                          setSobre(null);
                        }}
                        onMover={tentarMover}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        module="Flux"
        title="Fluxo de atividades"
        description="Quadro por situação. Arraste os cartões (ou use Mover para) apenas para as transições permitidas — cada movimentação é registrada no histórico."
        actions={
          podeEditarDemandas(usuario) && (
            <Link to="/flux/demandas/nova" className="btn btn-primary">
              <Icon name="plus" size={15} className="me-1" />
              Nova demanda
            </Link>
          )
        }
      />
      <form
        className="card card-body shadow-sm mb-3"
        role="search"
        aria-label="Filtros do quadro"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="row g-2 align-items-end">
          <div className="col-12 col-lg-4">
            <label htmlFor="kb-q" className="form-label small mb-1">
              Pesquisar
            </label>
            <input
              id="kb-q"
              type="search"
              className="form-control"
              placeholder="Número, título ou município"
              value={filtros.q}
              onChange={definir('q')}
            />
          </div>
          <div className="col-6 col-lg-3">
            <label htmlFor="kb-equipe" className="form-label small mb-1">
              Equipe
            </label>
            <select
              id="kb-equipe"
              className="form-select"
              value={filtros.equipe}
              onChange={definir('equipe')}
            >
              <option value="">Todas</option>
              {equipes.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-lg-2">
            <label htmlFor="kb-prioridade" className="form-label small mb-1">
              Prioridade
            </label>
            <select
              id="kb-prioridade"
              className="form-select"
              value={filtros.prioridade}
              onChange={definir('prioridade')}
            >
              <option value="">Todas</option>
              {(catalogos.data?.prioridades ?? []).map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-3">
            <div className="form-check mb-2">
              <input
                id="kb-ocultar"
                type="checkbox"
                className="form-check-input"
                checked={filtros.ocultar}
                onChange={(e) => setFiltros((f) => ({ ...f, ocultar: e.target.checked }))}
              />
              <label htmlFor="kb-ocultar" className="form-check-label small">
                Ocultar finalizadas há mais de 30 dias
              </label>
            </div>
          </div>
        </div>
      </form>
      {corpo()}
      {acao && catalogos.data && (
        <AcaoKanban
          acao={acao.acao}
          demandaId={acao.id}
          catalogos={catalogos.data}
          onClose={() => setAcao(null)}
          onSucesso={aposAcao}
        />
      )}
    </>
  );
}
