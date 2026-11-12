import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { perguntar } from '../../api/assistenteApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import PageHeader from '../../components/PageHeader.jsx';

const SUGESTOES = [
  'Quais documentos tratam de vistoria?',
  'O que o laudo ambiental informa sobre desmatamento?',
  'Há relatórios sobre queimadas em Cuiabá?',
];
const LIMITE = 500;
const SEM_INFORMACAO = /^n[aã]o h[aá] informa[cç][aã]o suficiente/i;

function Resposta({ item }) {
  const semInfo = SEM_INFORMACAO.test(item.resposta ?? '');
  return (
    <div className="card card-body shadow-sm mb-3" data-testid="resposta">
      <div className="mb-2">
        <span className="nx-badge nx-badge-gray" data-testid="modo-resposta">
          {item.modo}
        </span>
      </div>
      <p className={`mb-2 ${semInfo ? 'text-body-secondary fst-italic' : ''}`}>{item.resposta}</p>
      {item.referencias?.length > 0 && (
        <>
          <h3 className="h6">Referências</h3>
          <ul className="list-unstyled mb-0">
            {item.referencias.map((r, i) => (
              <li key={`${r.documentoId}-${i}`} className="mb-2">
                <Link to={`/docia/documentos/${r.documentoId}`}>{r.titulo}</Link>
                <blockquote className="small text-body-secondary border-start ps-2 mb-0">
                  {r.trecho}
                </blockquote>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Assistente DocIA (`/docia/assistente`): perguntas sobre os documentos, com modo e referências. */
export default function AssistentePage() {
  const [texto, setTexto] = useState('');
  const [conversa, setConversa] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const fim = useRef(null);

  useEffect(() => {
    fim.current?.scrollIntoView?.({ block: 'end' });
  }, [conversa, enviando]);

  async function enviar(pergunta) {
    const p = pergunta.trim();
    if (!p || enviando) return;
    setErro(null);
    setEnviando(true);
    setConversa((c) => [...c, { tipo: 'pergunta', texto: p }]);
    setTexto('');
    try {
      const r = await perguntar(p);
      setConversa((c) => [...c, { tipo: 'resposta', ...r }]);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível obter a resposta.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <PageHeader module="DocIA" title="Assistente DocIA" />
      <div className="alert alert-info" role="note">
        Assistente demonstrativo: as respostas são extraídas dos documentos cadastrados. A
        identificação do modo aparece em cada resposta.
      </div>

      {conversa.length === 0 && (
        <section aria-labelledby="sugestoes" className="mb-3">
          <h2 id="sugestoes" className="h6">
            Sugestões de perguntas
          </h2>
          <div className="d-flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => enviar(s)}
                disabled={enviando}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      <div aria-live="polite" className="mb-3">
        {conversa.map((item, i) =>
          item.tipo === 'pergunta' ? (
            <p key={i} className="text-end">
              <span className="d-inline-block bg-primary text-white rounded px-3 py-2">
                {item.texto}
              </span>
            </p>
          ) : (
            <Resposta key={i} item={item} />
          ),
        )}
        {enviando && <p className="text-body-secondary">Consultando documentos…</p>}
        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}
        <div ref={fim} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <label htmlFor="pergunta" className="form-label">
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
          <button type="submit" className="btn btn-primary" disabled={enviando || !texto.trim()}>
            Perguntar
          </button>
        </div>
        <div className="form-text">
          {texto.length}/{LIMITE} caracteres
        </div>
      </form>
    </>
  );
}
