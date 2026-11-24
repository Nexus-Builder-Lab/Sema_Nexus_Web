import { AlertTriangle, ArrowLeftRight, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { compararDocumentos } from '../../api/comparacaoApi.js';
import { detalharDocumento, listarDocumentos } from '../../api/documentosApi.js';
import { mensagemDeErro } from '../../api/httpClient.js';
import DiffView from '../../components/DiffView.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import KpiCard from '../../components/KpiCard.jsx';
import Loading from '../../components/Loading.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { montarCampos } from './comparacaoCampos.js';
import ExplicarImpacto from './ExplicarImpacto.jsx';

const pct = (v) =>
  `${Number(v ?? 0)
    .toFixed(1)
    .replace('.', ',')}%`;
const trunc = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s ?? ''));

const STATUS = {
  igual: { rotulo: 'Coincidente', badge: 'nx-badge-green', celula: 'nx-cmp-same' },
  diferente: { rotulo: 'Divergente', badge: 'nx-badge-amber', celula: 'nx-cmp-diff' },
  ausente: { rotulo: 'Presente em um só', badge: 'nx-badge-red', celula: 'nx-cmp-missing' },
};

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

function Celula({ valor, status }) {
  return valor === undefined ? (
    <td className="nx-cmp-missing">ausente</td>
  ) : (
    <td className={STATUS[status].celula}>{valor}</td>
  );
}

function Resultado({ aId, bId, docs }) {
  const [estado, setEstado] = useState({ loading: true, erro: null, res: null, ta: '', tb: '' });
  const [tentativa, setTentativa] = useState(0);
  const [soDif, setSoDif] = useState(false);

  useEffect(() => {
    let ativo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado({ loading: true, erro: null, res: null, ta: '', tb: '' });
    const texto = (id) =>
      detalharDocumento(id).then(
        (d) => d.textoExtraido ?? '',
        () => '',
      );
    Promise.all([compararDocumentos(aId, bId), texto(aId), texto(bId)]).then(
      ([res, ta, tb]) => ativo && setEstado({ loading: false, erro: null, res, ta, tb }),
      (e) =>
        ativo &&
        setEstado({
          loading: false,
          erro: mensagemDeErro(e, 'Não foi possível comparar os documentos.'),
          res: null,
          ta: '',
          tb: '',
        }),
    );
    return () => {
      ativo = false;
    };
  }, [aId, bId, tentativa]);

  const { loading, erro, res, ta, tb } = estado;
  const campos = useMemo(() => (res ? montarCampos(res.metadados, ta, tb) : []), [res, ta, tb]);
  const conta = (s) => campos.filter((c) => c.status === s).length;
  const nomeA = docs.find((d) => d.id === aId)?.titulo ?? res?.a?.titulo ?? 'A';
  const nomeB = docs.find((d) => d.id === bId)?.titulo ?? res?.b?.titulo ?? 'B';

  if (loading) return <Loading message="Comparando documentos…" />;
  if (erro)
    return (
      <div data-testid="erro-comparacao">
        <ErrorState message={erro} onRetry={() => setTentativa((n) => n + 1)} />
      </div>
    );

  const linhas = (res.diffLinhas ?? []).filter((l) => !soDif || l.tipo !== 'IGUAL');
  return (
    <div data-testid="resultado">
      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <KpiCard
            label="Similaridade textual"
            value={pct(res.similaridade)}
            icon="percent"
            variant="blue"
            hint="Linhas idênticas ÷ total de linhas"
          />
        </div>
        <div className="col-6 col-xl-3">
          <KpiCard
            label="Campos coincidentes"
            value={conta('igual')}
            icon="check"
            variant="green"
          />
        </div>
        <div className="col-6 col-xl-3">
          <KpiCard
            label="Campos divergentes"
            value={conta('diferente')}
            icon="alert"
            variant="amber"
          />
        </div>
        <div className="col-6 col-xl-3">
          <KpiCard
            label="Presentes em apenas um"
            value={conta('ausente')}
            icon="slash"
            variant="red"
          />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-transparent d-flex flex-wrap justify-content-between gap-2">
          <h2 className="h6 mb-0">Comparação de campos</h2>
          <span className="small text-body-secondary">
            Metadados do cadastro e campos &quot;Rótulo: valor&quot; do texto
          </span>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0 nx-cmp-table">
            <thead>
              <tr>
                <th scope="col">Campo</th>
                <th scope="col">
                  <Link to={`/docia/documentos/${aId}`}>{trunc(nomeA, 45)}</Link>
                </th>
                <th scope="col">
                  <Link to={`/docia/documentos/${bId}`}>{trunc(nomeB, 45)}</Link>
                </th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {campos.map((c) => (
                <tr key={`${c.origem}-${c.campo}`}>
                  <th scope="row" className="fw-semibold">
                    {c.campo}{' '}
                    {c.origem === 'cadastro' && (
                      <span className="nx-badge nx-badge-gray">cadastro</span>
                    )}
                  </th>
                  <Celula valor={c.a} status={c.status} />
                  <Celula valor={c.b} status={c.status} />
                  <td>
                    <span className={`nx-badge ${STATUS[c.status].badge}`}>
                      {STATUS[c.status].rotulo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExplicarImpacto aId={aId} bId={bId} />

      <div className="card mb-4">
        <div className="card-header bg-transparent d-flex flex-wrap justify-content-between gap-2">
          <h2 className="h6 mb-0">Diferenças textuais</h2>
          <div className="form-check mb-0">
            <input
              id="so-dif"
              type="checkbox"
              className="form-check-input"
              checked={soDif}
              onChange={(e) => setSoDif(e.target.checked)}
            />
            <label htmlFor="so-dif" className="form-check-label small">
              Mostrar apenas linhas diferentes
            </label>
          </div>
        </div>
        <div className="card-body">
          <p className="small text-body-secondary">
            <span className="nx-badge nx-badge-red me-2">− removido (só em A)</span>
            <span className="nx-badge nx-badge-green">+ adicionado (só em B)</span>
          </p>
          {res.truncado && (
            <div className="alert alert-warning py-2" role="status">
              Texto muito longo: a comparação considerou apenas o trecho inicial.
            </div>
          )}
          <DiffView linhas={linhas} />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h6">Trechos semelhantes</h2>
          {res.trechosSemelhantes?.length ? (
            <ul className="list-unstyled mb-0">
              {res.trechosSemelhantes.map((t, i) => (
                <li key={i} className="border rounded p-2 mb-2">
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
            <p className="text-body-secondary mb-0">Nenhum trecho semelhante encontrado.</p>
          )}
          <h2 className="h6 mt-3">Termos exclusivos</h2>
          <div className="row g-3">
            <Termos titulo="Somente no documento A" termos={res.termosExclusivosA} />
            <Termos titulo="Somente no documento B" termos={res.termosExclusivosB} />
          </div>
          <p className="small text-body-secondary mt-3 mb-0" data-testid="similaridade">
            Similaridade do texto: {pct(res.similaridade)} · similaridade de termos:{' '}
            {pct(res.similaridadeTermos)}.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Comparação documental (`/docia/comparacao`): seletores A/B, KPIs, campos e diff textual. */
export default function ComparacaoPage() {
  const [docs, setDocs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(null);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');

  useEffect(() => {
    let ativo = true;
    listarDocumentos({ size: 100 })
      .then((p) => {
        if (!ativo) return;
        const lista = p.content ?? [];
        setDocs(lista);
        if (lista.length >= 2) {
          setAId(String(lista[0].id));
          setBId(String(lista[1].id));
        }
      })
      .catch(
        (e) => ativo && setErroLista(mensagemDeErro(e, 'Não foi possível carregar os documentos.')),
      )
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const mesmo = aId !== '' && aId === bId;
  const opcoes = docs.map((d) => (
    <option key={d.id} value={d.id}>
      {d.titulo}
    </option>
  ));

  return (
    <>
      <PageHeader
        module="DocIA"
        title="Comparação documental"
        description="Selecione dois documentos para identificar informações coincidentes, divergentes, diferenças textuais e campos presentes em apenas um deles."
      />
      <div className="nx-ai-disclaimer d-flex gap-2 mb-4" role="note">
        <Info size={16} className="flex-shrink-0 mt-1" aria-hidden="true" />
        <div>
          Comparação determinística (algoritmo de diferenças de texto e campos &quot;Rótulo:
          valor&quot;): não é inteligência artificial. Documentos fictícios.
        </div>
      </div>

      {carregando && <Loading message="Carregando documentos…" />}
      {erroLista && <ErrorState message={erroLista} />}
      {!carregando && !erroLista && docs.length < 2 && (
        <EmptyState
          title="Selecione dois documentos"
          message="São necessários ao menos dois documentos cadastrados para comparar."
        />
      )}

      {!carregando && docs.length >= 2 && (
        <>
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md">
                  <label htmlFor="doc-a" className="form-label small">
                    Documento A
                  </label>
                  <select
                    id="doc-a"
                    className="form-select"
                    value={aId}
                    onChange={(e) => setAId(e.target.value)}
                  >
                    {opcoes}
                  </select>
                </div>
                <div className="col-md-auto">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Inverter"
                    aria-label="Inverter documentos A e B"
                    onClick={() => {
                      setAId(bId);
                      setBId(aId);
                    }}
                  >
                    <ArrowLeftRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="col-md">
                  <label htmlFor="doc-b" className="form-label small">
                    Documento B
                  </label>
                  <select
                    id="doc-b"
                    className="form-select"
                    value={bId}
                    onChange={(e) => setBId(e.target.value)}
                  >
                    {opcoes}
                  </select>
                </div>
              </div>
            </div>
          </div>
          {mesmo ? (
            <div className="alert alert-warning d-flex gap-2" role="alert">
              <AlertTriangle size={16} className="flex-shrink-0 mt-1" aria-hidden="true" />
              <div>Selecione dois documentos diferentes para comparar.</div>
            </div>
          ) : (
            <Resultado aId={Number(aId)} bId={Number(bId)} docs={docs} />
          )}
        </>
      )}
    </>
  );
}
