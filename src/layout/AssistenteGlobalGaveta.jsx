import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { assistenteGlobal } from '../api/agentesApi.js';
import { mensagemDeErro } from '../api/httpClient.js';
import Icon from '../components/Icon.jsx';
import { linksValidos } from './linksAssistente.js';

const MODOS = { LOCAL: 'IA local', CLAUDE: 'Claude', DEMONSTRATIVO: 'Demonstrativo' };
const FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Gaveta do Assistente Global (Ctrl+K / Cmd+K): `POST /api/agentes/assistente-global`, somente leitura.
 * Diálogo modal acessível (foco preso, Esc fecha), resposta em texto puro (aria-live), selo do modo e
 * links só para rotas internas conhecidas. Fechar cancela a requisição em andamento.
 */
export default function AssistenteGlobalGaveta({ aberta, onFechar }) {
  const titulo = useId();
  const raiz = useRef(null);
  const campo = useRef(null);
  const controle = useRef(null);
  const [pergunta, setPergunta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberta) {
      controle.current?.abort();
      return;
    }
    campo.current?.focus();
  }, [aberta]);

  useEffect(() => () => controle.current?.abort(), []);

  useEffect(() => {
    if (!aberta) return undefined;
    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onFechar();
        return;
      }
      if (e.key !== 'Tab' || !raiz.current) return;
      const itens = [...raiz.current.querySelectorAll(FOCAVEIS)];
      if (itens.length === 0) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (!raiz.current.contains(document.activeElement)) {
        e.preventDefault();
        primeiro.focus();
      } else if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberta, onFechar]);

  async function enviar(e) {
    e.preventDefault();
    const texto = pergunta.trim();
    if (!texto || carregando) return;
    const ctrl = new AbortController();
    controle.current = ctrl;
    setCarregando(true);
    setErro('');
    setResposta(null);
    try {
      const dados = await assistenteGlobal(texto, { signal: ctrl.signal });
      if (!ctrl.signal.aborted) setResposta(dados);
    } catch (err) {
      if (ctrl.signal.aborted || err?.code === 'ERR_CANCELED') return;
      setErro(
        err?.response?.status === 503
          ? 'O assistente está indisponível no momento. Tente novamente em instantes.'
          : mensagemDeErro(err, 'Não foi possível consultar o assistente.'),
      );
    } finally {
      if (controle.current === ctrl) controle.current = null;
      setCarregando(false);
    }
  }

  if (!aberta) return null;
  const links = linksValidos(resposta?.links);
  const modo = resposta ? (MODOS[resposta.modo] ?? String(resposta.modo ?? '')) : '';

  return (
    <div
      className="nx-assist-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        className="nx-assist-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo}
        ref={raiz}
      >
        <header className="nx-assist-head">
          <h2 id={titulo}>
            <Icon name="assistant" size={18} /> Assistente Global
          </h2>
          <button
            type="button"
            className="nx-icon-btn"
            onClick={onFechar}
            aria-label="Fechar assistente"
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <form className="nx-assist-form" onSubmit={enviar}>
          <label htmlFor={`${titulo}-q`} className="form-label">
            Pergunte sobre indicadores, prazos, demandas ou documentos
          </label>
          <textarea
            id={`${titulo}-q`}
            ref={campo}
            className="form-control"
            rows={3}
            maxLength={500}
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) enviar(e);
            }}
            placeholder="Ex.: Quais demandas estão com prazo vencido?"
          />
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">Somente leitura · {pergunta.length}/500</small>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={carregando || !pergunta.trim()}
            >
              Perguntar
            </button>
          </div>
        </form>
        <div className="nx-assist-body" aria-live="polite" aria-busy={carregando}>
          {carregando && (
            <p className="nx-assist-loading" role="status">
              <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Consultando o
              assistente… a primeira resposta da IA local pode levar de 30 a 50 segundos.
            </p>
          )}
          {erro && (
            <div className="alert alert-danger" role="alert">
              {erro}
            </div>
          )}
          {resposta && (
            <section aria-label="Resposta do assistente">
              <p className="mb-2">
                <span className="badge text-bg-secondary">
                  {modo}
                  {resposta.modelo ? ` · ${resposta.modelo}` : ''}
                </span>
              </p>
              <p className="nx-assist-resposta">{resposta.resposta}</p>
              {resposta.avisos?.length > 0 && (
                <ul className="small text-warning-emphasis">
                  {resposta.avisos.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              {links.length > 0 && (
                <nav aria-label="Atalhos sugeridos">
                  <ul className="nx-assist-links">
                    {links.map((l) => (
                      <li key={`${l.tipo}-${l.url}`}>
                        <Link to={l.url} onClick={onFechar}>
                          {l.rotulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              {resposta.aviso && <p className="small text-muted mb-0">{resposta.aviso}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
