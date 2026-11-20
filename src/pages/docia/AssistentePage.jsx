import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { statusAgentes } from '../../api/agentesApi.js';
import { perguntar } from '../../api/assistenteApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import { useAuth } from '../../auth/useAuth.js';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';

const SUGESTOES = [
  'Quais documentos tratam de vistoria?',
  'O que o laudo ambiental informa sobre desmatamento?',
  'Há relatórios sobre queimadas em Cuiabá?',
];
const LIMITE = 500;
const SEM_INFORMACAO = /^n[aã]o h[aá] informa[cç][aã]o suficiente/i;

/**
 * A aderência textual (alta/média/baixa) vem da busca textual da API e é relativa ao documento com mais
 * termos da pergunta: não é a probabilidade de a resposta estar correta (relatório técnico, P2).
 */
export const EXPLICACAO_ADERENCIA =
  'Aderência textual: quanto o documento contém os termos da pergunta, em comparação com o documento ' +
  'mais aderente desta busca. Não é a probabilidade de a resposta estar correta — confira o trecho citado.';
function Avatar() {
  return (
    <span className="nx-ai-avatar" aria-hidden="true">
      <Icon name="assistant" size={16} />
    </span>
  );
}

function Resposta({ item }) {
  const semInfo = SEM_INFORMACAO.test(item.resposta ?? '');
  const comAgente = item.agente === 'LOCAL' || item.agente === 'CLAUDE';
  const idExplicacao = useId();
  return (
    <div className="nx-ai-row" data-testid="resposta">
      <Avatar />
      <div className="nx-ai-bubble">
        <div className="nx-ai-mode" data-testid="modo-resposta">
          <Icon name={comAgente ? 'sparkles' : 'flask'} size={12} />
          {item.modo || 'Modo não informado'}
        </div>
        {comAgente && (
          <span className="badge nx-agente-selo mb-2" data-testid="agente-resposta">
            {item.agente === 'CLAUDE' ? 'Claude' : 'IA local'} · {item.modelo}
          </span>
        )}
        <p className={`mb-2 ${semInfo ? 'text-body-secondary fst-italic' : ''}`}>{item.resposta}</p>
        {item.referencias?.length > 0 && (
          <>
            <h3 className="h6">Referências</h3>
            <ul className="list-unstyled mb-0">
              {item.referencias.map((r, i) => (
                <li key={`${r.documentoId}-${i}`} className="mb-2">
                  <Link to={`/docia/documentos/${r.documentoId}`}>{r.titulo}</Link>
                  {r.aderenciaTextual && (
                    <span
                      className="badge text-bg-light border ms-2 fw-normal"
                      data-testid="aderencia-textual"
                      title={EXPLICACAO_ADERENCIA}
                      aria-describedby={idExplicacao}
                    >
                      Aderência textual: {r.aderenciaTextual}
                    </span>
                  )}
                  <blockquote className="small text-body-secondary border-start ps-2 mb-0">
                    {r.trecho}
                  </blockquote>
                </li>
              ))}
            </ul>
            {item.referencias.some((r) => r.aderenciaTextual) && (
              <p
                className="small text-body-secondary mb-0"
                id={idExplicacao}
                data-testid="explicacao-aderencia"
              >
                {EXPLICACAO_ADERENCIA}
              </p>
            )}
          </>
        )}
        {comAgente && item.passos?.length > 0 && (
          <details className="small mt-2">
            <summary>Como o agente chegou à resposta</summary>
            <ul className="mb-0 mt-1">
              {item.passos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

/** Assistente DocIA (`/docia/assistente`): perguntas sobre os documentos, com modo e referências. */
export default function AssistentePage() {
  const { usuario } = useAuth();
  const [texto, setTexto] = useState('');
  const [conversa, setConversa] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [agentes, setAgentes] = useState(null);
  const fim = useRef(null);

  useEffect(() => {
    let ativo = true;
    statusAgentes()
      .then((s) => ativo && setAgentes(s))
      .catch(() => ativo && setAgentes(null));
    return () => {
      ativo = false;
    };
  }, []);
  const docia = agentes?.agentes?.find((a) => a.id === 'docia');
  const comIa = agentes && agentes.modo !== 'DEMONSTRATIVO' && docia;
  const primeiroNome = (usuario?.nome ?? '').trim().split(/\s+/)[0];

  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: 'end' });
  }, [conversa, enviando]);

  async function enviar(pergunta) {
    const p = pergunta.trim();
    if (!p || enviando) return;
    setErro(null);
    setEnviando(true);
    setConversa((c) => [...c, { tipo: 'pergunta', texto: p }]);
    setHistorico((h) => [p, ...h.filter((x) => x !== p)].slice(0, 10));
    setTexto('');
    try {
      const r = await perguntar(p);
      setConversa((c) => [...c, { tipo: 'resposta', ...r }]);
    } catch (e) {
      setTexto((atual) => atual || p);
      setErro(mensagemDeErro(e, 'Não foi possível obter a resposta.'));
    } finally {
      setEnviando(false);
    }
  }

  function limpar() {
    setConversa([]);
    setHistorico([]);
    setErro(null);
    setTexto('');
  }

  return (
    <>
      <PageHeader
        module="DocIA"
        title="Assistente DocIA"
        description="Assistente para consultas sobre os documentos cadastrados no SEMA ALERTA."
        actions={
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpar}>
            <Icon name="trash" size={14} /> Limpar conversa
          </button>
        }
      />
      <div className="nx-ai-banner" role="note">
        {comIa ? (
          <>
            <strong>Agente DocIA com IA {agentes.modo === 'CLAUDE' ? 'Claude' : 'local'}</strong> (
            {docia.modelo}) — o agente busca e lê os documentos cadastrados (dados fictícios) e
            responde com citações conferidas pelo sistema
            {agentes.modo === 'LOCAL' && ', sem custo e sem enviar dados para fora do servidor'}.
            Não orienta sobre legislação, normas ou procedimentos oficiais. A identificação do modo
            aparece em cada resposta.
          </>
        ) : (
          <>
            <strong>Modo demonstração</strong> — sem modelo de IA conectado. As respostas são
            extraídas dos documentos cadastrados (dados fictícios), respeitando as permissões do seu
            perfil. O assistente não inventa legislação, normas ou procedimentos oficiais. A
            identificação do modo aparece em cada resposta.
          </>
        )}
      </div>

      <div className="nx-ai-layout">
        <section className="card nx-ai-chat" aria-label="Conversa">
          <div className="nx-ai-msgs" aria-live="polite">
            <div className="nx-ai-row">
              <Avatar />
              <div className="nx-ai-bubble">
                <div className="nx-ai-mode">
                  <Icon name="flask" size={12} /> Modo demonstrativo
                </div>
                Olá{primeiroNome ? `, ${primeiroNome}` : ''}! Sou o Assistente DocIA. Pergunte sobre
                os documentos cadastrados ou escolha uma das sugestões ao lado.
              </div>
            </div>
            {conversa.map((item, i) =>
              item.tipo === 'pergunta' ? (
                <div key={i} className="nx-ai-row nx-ai-user">
                  <div className="nx-ai-bubble nx-ai-bubble-user">{item.texto}</div>
                </div>
              ) : (
                <Resposta key={i} item={item} />
              ),
            )}
            {enviando && (
              <p className="text-body-secondary small" role="status">
                {comIa
                  ? 'O agente está buscando e lendo os documentos…'
                  : 'Consultando documentos…'}
              </p>
            )}
            {erro && (
              <div className="alert alert-danger" role="alert">
                {erro}
              </div>
            )}
            <div ref={fim} />
          </div>
          <form
            className="nx-ai-form"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
          >
            <label htmlFor="pergunta" className="visually-hidden">
              Sua pergunta
            </label>
            <div className="input-group">
              <input
                id="pergunta"
                className="form-control"
                value={texto}
                maxLength={LIMITE}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Pergunte sobre os documentos"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={enviando || !texto.trim()}
              >
                <Icon name="send" size={14} /> Perguntar
              </button>
            </div>
            <div className="form-text">
              {texto.length}/{LIMITE} caracteres
            </div>
          </form>
        </section>

        <aside className="nx-ai-side d-grid gap-3">
          <section className="card card-body" aria-labelledby="sugestoes">
            <h2 id="sugestoes" className="h6 d-flex align-items-center gap-2">
              <Icon name="sparkles" size={14} /> Sugestões de perguntas
            </h2>
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-outline-secondary btn-sm nx-ai-chip"
                onClick={() => enviar(s)}
                disabled={enviando}
              >
                {s}
              </button>
            ))}
          </section>
          <section className="card card-body" aria-labelledby="historico">
            <h2 id="historico" className="h6 d-flex align-items-center gap-2">
              <Icon name="history" size={14} /> Histórico
            </h2>
            {historico.length === 0 ? (
              <p className="small text-body-secondary mb-0">Nenhuma pergunta nesta sessão.</p>
            ) : (
              historico.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="btn btn-outline-secondary btn-sm nx-ai-chip"
                  onClick={() => enviar(h)}
                  disabled={enviando}
                >
                  {h}
                </button>
              ))
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
