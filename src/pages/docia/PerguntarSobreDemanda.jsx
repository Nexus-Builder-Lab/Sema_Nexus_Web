import { useEffect, useRef, useState } from 'react';
import { perguntar } from '../../api/assistenteApi.js';
import { listarDocumentosDaDemanda } from '../../api/documentosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import Icon from '../../components/Icon.jsx';
import RespostaDocia from '../../components/RespostaDocia.jsx';

const LIMITE = 500;

function mensagemDoErro(e) {
  const status = e?.response?.status;
  if (status === 403) return 'Você não tem acesso a esta demanda.';
  if (status === 404) return 'Demanda não encontrada.';
  return mensagemDeErro(e, 'Não foi possível obter a resposta.');
}

/** Painel "Perguntar ao DocIA sobre esta demanda": a API restringe a busca aos documentos vinculados. */
export default function PerguntarSobreDemanda({ demandaId }) {
  const [texto, setTexto] = useState('');
  const [respostas, setRespostas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [semDocumentos, setSemDocumentos] = useState(false);
  const fim = useRef(null);
  const atual = useRef(demandaId);
  useEffect(() => {
    atual.current = demandaId;
  }, [demandaId]);

  useEffect(() => {
    let ativo = true;
    listarDocumentosDaDemanda(demandaId)
      .then((docs) => ativo && setSemDocumentos(Array.isArray(docs) && docs.length === 0))
      .catch(() => ativo && setSemDocumentos(false));
    return () => {
      ativo = false;
    };
  }, [demandaId]);

  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: 'nearest' });
  }, [respostas, enviando]);

  async function enviar(e) {
    e.preventDefault();
    const p = texto.trim();
    if (!p || enviando) return;
    setErro(null);
    setEnviando(true);
    try {
      const r = await perguntar(p, { demandaId: Number(demandaId) });
      if (atual.current !== demandaId) return;
      setRespostas((rs) => [...rs, { pergunta: p, ...r }]);
      setTexto('');
    } catch (err) {
      if (atual.current !== demandaId) return;
      setErro(mensagemDoErro(err));
    } finally {
      if (atual.current === demandaId) setEnviando(false);
    }
  }

  return (
    <section className="card card-body shadow-sm mb-3" aria-labelledby="docia-demanda">
      <h2 id="docia-demanda" className="h5 mb-2 d-flex align-items-center gap-2">
        <Icon name="sparkles" size={16} /> Perguntar ao DocIA sobre esta demanda
      </h2>
      <p className="small text-body-secondary">
        A busca considera só os documentos vinculados a esta demanda. A identificação do modo (IA
        local, Claude ou demonstrativo) aparece em cada resposta.
      </p>
      {semDocumentos && (
        <p className="small text-body-secondary fst-italic" data-testid="docia-sem-documentos">
          Esta demanda ainda não tem documentos vinculados; o DocIA não terá informação suficiente
          para responder.
        </p>
      )}
      <div aria-live="polite" className="d-grid gap-3 mb-3">
        {respostas.map((r, i) => (
          <div key={i}>
            <p className="small fw-semibold mb-1" data-testid="pergunta-demanda">
              {r.pergunta}
            </p>
            <RespostaDocia item={r} />
          </div>
        ))}
        {enviando && (
          <p className="text-body-secondary small mb-0" role="status">
            Consultando os documentos da demanda… a primeira resposta pode levar de 30 a 50
            segundos.
          </p>
        )}
        {erro && (
          <div className="alert alert-danger mb-0" role="alert">
            {erro}
          </div>
        )}
        <div ref={fim} />
      </div>
      <form onSubmit={enviar}>
        <label htmlFor="pergunta-demanda" className="visually-hidden">
          Pergunta sobre a demanda
        </label>
        <div className="input-group">
          <input
            id="pergunta-demanda"
            className="form-control"
            value={texto}
            maxLength={LIMITE}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pergunte sobre os documentos desta demanda"
          />
          <button type="submit" className="btn btn-primary" disabled={enviando || !texto.trim()}>
            <Icon name="send" size={14} /> Perguntar
          </button>
        </div>
      </form>
    </section>
  );
}
