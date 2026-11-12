import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { compararDocumentos } from '../../api/comparacaoApi.js';
import { listarDocumentos } from '../../api/documentosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import DiffView from '../../components/DiffView.jsx';
import PageHeader from '../../components/PageHeader.jsx';

const pct = (v) => `${Number(v ?? 0).toFixed(1).replace('.', ',')}%`;

function Termos({ titulo, termos }) {
  return (
    <div className="col-md-6">
      <h3 className="h6">{titulo}</h3>
      {termos?.length ? (
        <div className="d-flex flex-wrap gap-1">
          {termos.map((t) => (
            <span key={t} className="nx-badge nx-badge-gray">
              {t}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-body-secondary small mb-0">Nenhum termo exclusivo.</p>
      )}
    </div>
  );
}

/** Comparação documental (`/docia/comparacao`): metadados, diff, trechos semelhantes e termos exclusivos. */
export default function ComparacaoPage() {
  const [docs, setDocs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [comparando, setComparando] = useState(false);
  const [erro, setErro] = useState(null);
  const [res, setRes] = useState(null);

  useEffect(() => {
    let ativo = true;
    listarDocumentos({ size: 100 })
      .then((p) => ativo && setDocs(p.content ?? []))
      .catch(
        (e) => ativo && setErroLista(mensagemDeErro(e, 'Não foi possível carregar os documentos.')),
      )
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const mesmo = aId !== '' && aId === bId;
  const podeComparar = aId !== '' && bId !== '' && !mesmo && !comparando;

  async function comparar(e) {
    e.preventDefault();
    if (!podeComparar) return;
    setErro(null);
    setRes(null);
    setComparando(true);
    try {
      setRes(await compararDocumentos(Number(aId), Number(bId)));
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível comparar os documentos.'));
    } finally {
      setComparando(false);
    }
  }

  const opcoes = docs.map((d) => (
    <option key={d.id} value={d.id}>
      {d.titulo}
    </option>
  ));

  return (
    <>
      <PageHeader module="DocIA" title="Comparação documental" />
      <div className="alert alert-info" role="note">
        Comparação determinística (algoritmo de diferenças de texto): não é inteligência artificial.
        Documentos fictícios.
      </div>

      {carregando && <p className="text-body-secondary">Carregando documentos…</p>}
      {erroLista && (
        <div className="alert alert-danger" role="alert">
          {erroLista}
        </div>
      )}
      {!carregando && !erroLista && docs.length < 2 && (
        <p className="text-body-secondary">
          São necessários ao menos dois documentos cadastrados para comparar.
        </p>
      )}

      {!carregando && docs.length >= 2 && (
        <form onSubmit={comparar} className="row g-3 align-items-end mb-4">
          <div className="col-md-5">
            <label htmlFor="doc-a" className="form-label">
              Documento A
            </label>
            <select
              id="doc-a"
              className="form-select"
              value={aId}
              onChange={(e) => setAId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {opcoes}
            </select>
          </div>
          <div className="col-md-5">
            <label htmlFor="doc-b" className="form-label">
              Documento B
            </label>
            <select
              id="doc-b"
              className="form-select"
              value={bId}
              onChange={(e) => setBId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {opcoes}
            </select>
          </div>
          <div className="col-md-2 d-grid">
            <button type="submit" className="btn btn-primary" disabled={!podeComparar}>
              {comparando ? 'Comparando…' : 'Comparar'}
            </button>
          </div>
          {mesmo && (
            <div className="col-12 text-danger small" role="alert">
              Selecione dois documentos diferentes.
            </div>
          )}
        </form>
      )}

      {erro && (
        <div className="alert alert-warning" role="alert" data-testid="erro-comparacao">
          {erro}
        </div>
      )}

      {res && (
        <div data-testid="resultado">
          <section className="mb-4" aria-labelledby="meta">
            <h2 id="meta" className="h5">
              Metadados
            </h2>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th scope="col">Campo</th>
                    <th scope="col">
                      A: <Link to={`/docia/documentos/${res.a?.id}`}>{res.a?.titulo}</Link>
                    </th>
                    <th scope="col">
                      B: <Link to={`/docia/documentos/${res.b?.id}`}>{res.b?.titulo}</Link>
                    </th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {(res.metadados ?? []).map((m) => (
                    <tr key={m.campo} className={m.igual ? '' : 'table-warning'}>
                      <th scope="row">{m.campo}</th>
                      <td>{m.valorA || '—'}</td>
                      <td>{m.valorB || '—'}</td>
                      <td>{m.igual ? 'Igual' : 'Diferente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-4" aria-labelledby="diff">
            <h2 id="diff" className="h5">
              Diferenças no texto
            </h2>
            <p className="small text-body-secondary">
              <span className="nx-badge nx-badge-gray me-2">− removido (só em A)</span>
              <span className="nx-badge nx-badge-gray">+ adicionado (só em B)</span>
            </p>
            {res.truncado && (
              <div className="alert alert-warning py-2" role="status">
                Texto muito longo: a comparação considerou apenas o trecho inicial.
              </div>
            )}
            <DiffView linhas={res.diffLinhas} />
          </section>

          <section className="mb-4" aria-labelledby="sem">
            <h2 id="sem" className="h5">
              Trechos semelhantes
            </h2>
            {res.trechosSemelhantes?.length ? (
              <ul className="list-unstyled">
                {res.trechosSemelhantes.map((t, i) => (
                  <li key={i} className="card card-body mb-2">
                    <div className="row g-2">
                      <blockquote className="col-md-6 mb-0 small">{t.trechoA}</blockquote>
                      <blockquote className="col-md-6 mb-0 small">{t.trechoB}</blockquote>
                    </div>
                    <div className="small text-body-secondary mt-1">
                      Similaridade do trecho: {pct(t.similaridade)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-secondary">Nenhum trecho semelhante encontrado.</p>
            )}
          </section>

          <section className="mb-4" aria-labelledby="exc">
            <h2 id="exc" className="h5">
              Termos exclusivos
            </h2>
            <div className="row g-3">
              <Termos titulo="Somente no documento A" termos={res.termosExclusivosA} />
              <Termos titulo="Somente no documento B" termos={res.termosExclusivosB} />
            </div>
          </section>

          <p className="small text-body-secondary" data-testid="similaridade">
            Informação secundária — similaridade do texto: {pct(res.similaridade)} · similaridade de
            termos: {pct(res.similaridadeTermos)}.
          </p>
        </div>
      )}
    </>
  );
}
