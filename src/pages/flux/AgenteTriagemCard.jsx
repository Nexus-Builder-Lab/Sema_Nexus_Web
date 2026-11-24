import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sugerirTriagem } from '../../api/demandasApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import Icon from '../../components/Icon.jsx';
import EvidenciaEspacial from './EvidenciaEspacial.jsx';
import { rotuloModo } from './agenteTriagem.js';

const DECISOES = {
  CLASSIFICAR: 'Classificar a demanda',
  SOLICITAR_COMPLEMENTACAO: 'Solicitar complementação',
};

/**
 * Agente de Triagem (Issue API#107) dentro do modal de triagem: pede uma sugestão, mostra o que o
 * agente consultou e permite aplicar categoria, prioridade e justificativa no formulário. Nada é
 * gravado aqui: a pessoa revisa e confirma a triagem normalmente.
 */
export default function AgenteTriagemCard({ demandaId, decisao, catalogos, onAplicar }) {
  const [estado, setEstado] = useState('inicial'); // inicial | carregando | pronto | erro
  const [sugestao, setSugestao] = useState(null);
  const [erro, setErro] = useState(null);
  const [aplicada, setAplicada] = useState(false);

  async function pedir() {
    setEstado('carregando');
    setErro(null);
    setAplicada(false);
    try {
      setSugestao(await sugerirTriagem(demandaId));
      setEstado('pronto');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível obter a sugestão do agente.'));
      setEstado('erro');
    }
  }

  const rotulo = (lista, codigo) => lista?.find((x) => x.codigo === codigo)?.rotulo ?? codigo;
  const divergente = sugestao && sugestao.decisao !== decisao;

  function aplicar() {
    const nucleo = sugestao.nucleo ? ` Núcleo regional sugerido: ${sugestao.nucleo.sigla}.` : '';
    onAplicar({
      categoria: divergente ? null : sugestao.categoria,
      prioridade: divergente ? null : sugestao.prioridade,
      justificativa: `${sugestao.justificativa}${nucleo}`,
    });
    setAplicada(true);
  }

  if (estado === 'inicial' || estado === 'erro') {
    return (
      <div className="nx-agente-card mb-3" aria-label="Agente de Triagem">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Icon name="sparkles" className="text-success" />
          <span className="fw-semibold">Agente de Triagem</span>
          <span className="small text-body-secondary flex-grow-1">
            Consulta o relato, demandas semelhantes e o INPE e sugere a classificação.
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
      </div>
    );
  }

  if (estado === 'carregando') {
    return (
      <div className="nx-agente-card mb-3" aria-label="Agente de Triagem" aria-busy="true">
        <div className="d-flex align-items-center gap-2" role="status">
          <span className="spinner-border spinner-border-sm text-success" aria-hidden="true" />
          <span>O agente está consultando a demanda, demandas semelhantes e os dados do INPE…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="nx-agente-card mb-3" aria-label="Sugestão do Agente de Triagem">
      <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
        <Icon name="sparkles" className="text-success" />
        <span className="fw-semibold">Sugestão do Agente de Triagem</span>
        <span className="badge nx-agente-selo" data-testid="agente-modo">
          {rotuloModo(sugestao)}
        </span>
      </div>
      <dl className="nx-agente-dados mb-2">
        <dt>Decisão</dt>
        <dd>{DECISOES[sugestao.decisao] ?? sugestao.decisao}</dd>
        {sugestao.categoria && (
          <>
            <dt>Categoria</dt>
            <dd>{rotulo(catalogos.categorias, sugestao.categoria)}</dd>
          </>
        )}
        {sugestao.prioridade && (
          <>
            <dt>Prioridade</dt>
            <dd>{rotulo(catalogos.prioridades, sugestao.prioridade)}</dd>
          </>
        )}
        {sugestao.nucleo && (
          <>
            <dt>Núcleo</dt>
            <dd>
              {sugestao.nucleo.sigla} — {sugestao.nucleo.nome}
            </dd>
          </>
        )}
      </dl>
      <p className="small mb-2">{sugestao.justificativa}</p>
      {sugestao.duplicatas.length > 0 && (
        <div className="small mb-2">
          <span className="fw-semibold">Possíveis duplicatas: </span>
          {sugestao.duplicatas.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ', '}
              <Link to={`/flux/demandas/${d.id}`} target="_blank" rel="noopener">
                {d.numero}
              </Link>
              {d.distanciaKm != null &&
                ` (a ${Number(d.distanciaKm).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km)`}
            </span>
          ))}
        </div>
      )}
      <EvidenciaEspacial espacial={sugestao.espacial} />
      {divergente && (
        <div className="alert alert-info small py-2 mb-2" role="note">
          O agente sugere <strong>{DECISOES[sugestao.decisao]?.toLowerCase()}</strong>. Aplicar
          preenche só a justificativa; avalie usar a outra opção de triagem.
        </div>
      )}
      {sugestao.avisos.map((a) => (
        <div key={a} className="small text-warning-emphasis mb-1">
          {a}
        </div>
      ))}
      <details className="small mb-2">
        <summary>Como o agente chegou à sugestão</summary>
        <ul className="mb-0 mt-1">
          {sugestao.evidencias.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </details>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button type="button" className="btn btn-sm btn-success" onClick={aplicar}>
          Aplicar sugestão
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={pedir}>
          Pedir de novo
        </button>
        <span className="small text-body-secondary">
          {aplicada
            ? 'Sugestão aplicada ao formulário: revise antes de confirmar.'
            : 'Sugestão de IA — revise antes de confirmar.'}
        </span>
      </div>
    </div>
  );
}
