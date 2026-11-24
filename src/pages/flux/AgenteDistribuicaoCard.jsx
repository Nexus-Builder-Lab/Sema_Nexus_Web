import { useEffect, useRef, useState } from 'react';
import { sugerirDistribuicao } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import Icon from '../../components/Icon.jsx';
import { rotuloModo } from './agenteTriagem.js';

const formatarPrazo = (iso) => iso.split('-').reverse().join('/');

/**
 * Agente de Distribuição (Issue API#130) dentro do modal de distribuição: pede uma sugestão, mostra
 * o que o agente consultou e permite aplicar equipe, fiscal e prazo no formulário. Nada é gravado
 * aqui: a pessoa revisa e confirma a distribuição normalmente. Respostas de uma consulta antiga
 * (modal fechado/reaberto ou novo pedido) são descartadas.
 */
export default function AgenteDistribuicaoCard({ demandaId, onAplicar }) {
  const [estado, setEstado] = useState('inicial'); // inicial | carregando | pronto | erro
  const [sugestao, setSugestao] = useState(null);
  const [erro, setErro] = useState(null);
  const [aplicada, setAplicada] = useState(false);
  const pedidoAtual = useRef(0);

  useEffect(
    () => () => {
      pedidoAtual.current += 1;
    },
    [],
  );

  async function pedir() {
    pedidoAtual.current += 1;
    const pedido = pedidoAtual.current;
    setEstado('carregando');
    setErro(null);
    setAplicada(false);
    try {
      const resposta = await sugerirDistribuicao(demandaId);
      if (pedido !== pedidoAtual.current) return;
      setSugestao(resposta);
      setEstado('pronto');
    } catch (e) {
      if (pedido !== pedidoAtual.current) return;
      setErro(mensagemDeErro(e, 'Não foi possível obter a sugestão do agente.'));
      setEstado('erro');
    }
  }

  function aplicar() {
    onAplicar({
      equipeId: sugestao.equipe ? String(sugestao.equipe.id) : null,
      fiscalId: sugestao.fiscal ? String(sugestao.fiscal.id) : null,
      prazo: sugestao.prazo ?? null,
    });
    setAplicada(true);
  }

  if (estado === 'inicial' || estado === 'erro') {
    return (
      <section className="nx-agente-card mb-3" aria-label="Agente de Distribuição">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Icon name="sparkles" className="text-success" />
          <span className="fw-semibold">Agente de Distribuição</span>
          <span className="small text-body-secondary flex-grow-1">
            Consulta a carga das equipes, as vistorias na região e o histórico da categoria.
          </span>
          <button type="button" className="btn btn-sm btn-outline-success" onClick={pedir}>
            Sugerir com o agente
          </button>
        </div>
        {erro && (
          <div className="alert alert-warning small mt-2 mb-0" role="alert">
            {erro}
          </div>
        )}
      </section>
    );
  }

  if (estado === 'carregando') {
    return (
      <section className="nx-agente-card mb-3" aria-label="Agente de Distribuição" aria-busy="true">
        <div className="d-flex align-items-center gap-2" role="status">
          <span className="spinner-border spinner-border-sm text-success" aria-hidden="true" />
          <span>
            O agente está consultando a carga das equipes e o histórico (a primeira consulta pode
            levar até 1 minuto)…
          </span>
        </div>
      </section>
    );
  }

  const vazia = !sugestao.equipe || !sugestao.fiscal;
  const { equipe, fiscal } = sugestao;
  return (
    <section className="nx-agente-card mb-3" aria-label="Sugestão do Agente de Distribuição">
      <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
        <Icon name="sparkles" className="text-success" />
        <span className="fw-semibold">Sugestão do Agente de Distribuição</span>
        <span className="badge nx-agente-selo" data-testid="agente-modo">
          {rotuloModo(sugestao)}
        </span>
      </div>
      <dl className="nx-agente-dados mb-2">
        <dt>Equipe</dt>
        <dd>
          {equipe
            ? `${equipe.nome}${equipe.setorSigla ? ` (${equipe.setorSigla})` : ''}`
            : 'Nenhuma equipe sugerida'}
        </dd>
        <dt>Fiscal</dt>
        <dd>
          {fiscal
            ? `${fiscal.nome} — ${fiscal.ativas} ativa(s), ${fiscal.atrasadas} atrasada(s), ${fiscal.proximasDoVencimento} vencendo em 7 dias`
            : 'Nenhum fiscal sugerido'}
        </dd>
        {sugestao.prazo && (
          <>
            <dt>Prazo</dt>
            <dd>{formatarPrazo(sugestao.prazo)}</dd>
          </>
        )}
      </dl>
      <p className="small mb-2">{sugestao.justificativa}</p>
      {sugestao.avisos.map((a) => (
        <div key={a} className="small text-warning-emphasis mb-1">
          {a}
        </div>
      ))}
      <details className="small mb-2">
        <summary>Como o agente chegou à sugestão</summary>
        <ul className="mb-0 mt-1">
          {sugestao.passos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </details>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button type="button" className="btn btn-sm btn-success" onClick={aplicar} disabled={vazia}>
          Aplicar sugestão
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={pedir}>
          Pedir de novo
        </button>
        <span className="small text-body-secondary" role="status">
          {aplicada
            ? 'Sugestão aplicada ao formulário: revise antes de distribuir.'
            : 'Sugestão de IA — revise antes de confirmar.'}
        </span>
      </div>
    </section>
  );
}
