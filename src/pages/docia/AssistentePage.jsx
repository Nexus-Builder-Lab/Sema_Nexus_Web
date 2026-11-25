import { useEffect, useRef, useState } from 'react';
import { statusAgentes } from '../../api/agentesApi.js';
import { perguntarStream } from '../../api/assistenteApi.js';
import { mensagemDeErroStream } from '../../api/sseClient.js';
import { useAgenteStream } from '../../api/useAgenteStream.js';
import ProgressoAgente from '../../components/ProgressoAgente.jsx';
import { useAuth } from '../../auth/useAuth.js';
import Icon from '../../components/Icon.jsx';
import RespostaDocia, { Avatar } from '../../components/RespostaDocia.jsx';
import PageHeader from '../../components/PageHeader.jsx';

const SUGESTOES = [
  'Quais documentos tratam de vistoria?',
  'O que o laudo ambiental informa sobre desmatamento?',
  'Há relatórios sobre queimadas em Cuiabá?',
];
const LIMITE = 500;
const MAX_TURNOS = 4;
const ABSTENCAO = /^n[aã]o h[aá] informa[cç][aã]o suficiente/i;

/** Últimos turnos completos (pergunta + resposta) da conversa, no formato `historico` da API. */
function turnosDoHistorico(conversa) {
  const turnos = [];
  let pergunta = null;
  for (const item of conversa) {
    if (item.tipo === 'pergunta') pergunta = item.texto;
    else if (pergunta !== null && item.resposta && !ABSTENCAO.test(item.resposta)) {
      turnos.push({ pergunta, resposta: item.resposta });
      pergunta = null;
    }
  }
  return turnos.slice(-MAX_TURNOS);
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
  const geracao = useRef(0);
  const { progresso, executar, cancelar } = useAgenteStream();

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
    const minha = geracao.current;
    try {
      const r = await executar((opcoes) =>
        perguntarStream(p, { historico: turnosDoHistorico(conversa), ...opcoes }),
      );
      if (r === undefined || minha !== geracao.current) return;
      setConversa((c) => [...c, { tipo: 'resposta', ...r }]);
    } catch (e) {
      if (minha !== geracao.current) return;
      setTexto((atual) => atual || p);
      setErro(mensagemDeErroStream(e, 'Não foi possível obter a resposta.'));
    } finally {
      if (minha === geracao.current) setEnviando(false);
    }
  }

  function limpar() {
    geracao.current += 1;
    cancelar();
    setEnviando(false);
    setConversa([]);
    setHistorico([]);
    setErro(null);
    setTexto('');
  }

  const contexto = turnosDoHistorico(conversa).length;

  return (
    <>
      <PageHeader
        module="DocIA"
        title="Assistente DocIA"
        description="Assistente para consultas sobre os documentos cadastrados no SEMA ALERTA."
        actions={
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpar}>
            <Icon name="trash" size={14} /> Nova conversa
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
            {contexto > 0 && (
              <p className="nx-ai-contexto small mb-0 mb-2" data-testid="contexto-ativo">
                <Icon name="history" size={12} /> Contexto ativo: considerando {contexto}{' '}
                {contexto === 1 ? 'turno anterior' : 'turnos anteriores'} desta conversa. Use “Nova
                conversa” para recomeçar sem contexto.
              </p>
            )}
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
                <RespostaDocia key={i} item={item} />
              ),
            )}
            <div className="text-body-secondary small mb-2">
              <ProgressoAgente
                progresso={progresso}
                ativo={enviando}
                rotulo={
                  comIa ? 'O agente está buscando e lendo os documentos' : 'Consultando documentos'
                }
              />
            </div>
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
